import RegisterForm from "../components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Panel izquierdo */}
      <div className="w-full md:w-1/2 bg-secondary text-primary-foreground flex flex-col justify-between p-10">
        <h1 className="text-lg font-bold">⌘ Tickify</h1>
        <p className="text-base mt-4 md:mt-0">
          Disfruta el festival de Música en Lima este 10 de Septiembre en el
          Teatro de Lima
        </p>
      </div>

      {/* Panel derecho */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-2 text-center">
            Bienvenido a Tickify
          </h2>
          <p className="text-muted-foreground mb-6 text-center">
            Registra tu cuenta
          </p>

          <RegisterForm />
        </div>
      </div>
    </div>
  );
}

