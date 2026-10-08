from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from users.models.UserSchema import RegisterRequest
from users.models.Usuario import Usuario
from users.models.Usuario import RolUsuario
from users.services.AutenticacionServicio import hash_password, validar_correo,validar_password
from users.models.Organizador import Organizador

def register_user(db: Session, request: RegisterRequest) -> Usuario:
    try:
        print(f"📝 RegisterController - Datos recibidos:")
        validar_correo(request.correo)
        validar_password(request.password)
        print(f"   Correo: {request.correo}")
        print(f"   Rol: {request.rol}")
        print(f"   Nombres: {request.nombres}")
        print(f"   Apellidos: {request.apellidos}")
        
        # 1. Verificar si ya existe el correo
        user_exists = db.query(Usuario).filter(Usuario.correo == request.correo).first()
        if user_exists:
            print(f"⚠️  Correo ya registrado: {request.correo}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo ya está registrado"
            )

        # Validar campos obligatorios si el rol es ORGANIZADOR
        if request.rol.upper() == "ORGANIZADOR":
            print(f"🔍 Validando campos de organizador...")
            if not request.ruc or not request.razon_social:
                print(f"⚠️  Faltan campos obligatorios - RUC: {request.ruc}, Razón Social: {request.razon_social}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Los campos 'ruc' y 'razon_social' son obligatorios para organizadores."
                )
            
            # Verificar si ya existe el RUC
            ruc_exists = db.query(Organizador).filter(Organizador.ruc == request.ruc).first()
            if ruc_exists:
                print(f"⚠️  RUC ya registrado: {request.ruc}")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="El RUC ya está registrado"
                )
        
        print(f"🔐 Hasheando password...")
        hashed_pwd = hash_password(request.password)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en validación inicial: {type(e).__name__}: {str(e)}")
        raise
    
    try:
        print(f"🔄 Convirtiendo rol a enum: {request.rol.upper()}")
        rol_enum = getattr(RolUsuario, request.rol.upper())
        print(f"✅ Rol enum obtenido: {rol_enum}")
    except AttributeError as e:
        print(f"❌ Error: Rol inválido '{request.rol}'. Roles válidos: CLIENTE, ORGANIZADOR, ADMIN")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido: '{request.rol}'. Roles válidos: CLIENTE, ORGANIZADOR, ADMIN"
        )

    try:
        print(f"👤 Creando nuevo usuario...")
        new_user = Usuario(
            nombres=request.nombres,
            apellidos=request.apellidos,
            correo=request.correo,
            telefono=request.telefono,
            password_hash=hashed_pwd,
            rol=rol_enum  # Usar el Enum directamente, no un String en mayúsculas
        )
        db.add(new_user)
        print(f"✅ Usuario agregado a la sesión")
    except Exception as e:
        print(f"❌ Error al crear usuario: {type(e).__name__}: {str(e)}")
        raise

    # 4. Crear el Organizador (si aplica)
    if new_user.rol == RolUsuario.ORGANIZADOR:
        try:
            print(f"🏢 Usuario es organizador, creando registro de organizador...")
            db.flush() 
            print(f"✅ Flush exitoso, usuario_id: {new_user.id}")
            
            organizador = Organizador(
                usuario_id=new_user.id, # El ID ya existe en la sesión
                ruc=request.ruc,
                razon_social=request.razon_social,
                dni=request.dni,
                telefono=request.telefono,
                direccion=request.direccion,
                correo_organizacional=request.correo_organizacional,
                motivacion=request.motivacion,
                sector=request.sector
            )
            db.add(organizador)
            print(f"✅ Organizador agregado a la sesión")
        except Exception as e:
            print(f"❌ Error al crear organizador: {type(e).__name__}: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear organizador: {str(e)}"
            )
    
    try:
        print(f"💾 Haciendo commit...")
        db.commit()
        print(f"✅ Commit exitoso")
        
        print(f"🔄 Refrescando usuario...")
        db.refresh(new_user)
        print(f"✅ Usuario refrescado exitosamente")
    except Exception as e:
        print(f"❌ Error en commit/refresh: {type(e).__name__}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar usuario: {str(e)}"
        )

    return new_user