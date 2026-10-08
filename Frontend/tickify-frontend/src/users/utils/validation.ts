export function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function isValidEmailCorporate(email: string): boolean {
  // Lista de dominios de correo gratuitos/personales a rechazar
  const freeDomains = [
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'yahoo.com',
    'icloud.com',
    'live.com',
    'msn.com',
    'aol.com',
    'protonmail.com',
    'zoho.com',
    'mail.com',
    'yandex.com',
    'gmx.com',
    'inbox.com',
    'fastmail.com',
    'tutanota.com',
    'proton.me'
  ];

  // Extraer el dominio del email
  const emailParts = email.toLowerCase().split('@');
  
  // Validar formato básico de email
  if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
    return false;
  }

  const domain = emailParts[1];

  // Rechazar si es un dominio gratuito
  if (freeDomains.includes(domain)) {
    return false;
  }

  // Validar que el dominio tenga un formato válido
  const domainPattern = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
  return domainPattern.test(domain);
}

export function isValidRUC(ruc: number | string): boolean {
  const rucStr = ruc.toString().trim();

  // Validar longitud (debe ser 11) y que sea un número entero
  if (rucStr.length !== 11 || !/^\d+$/.test(rucStr)) {
    return false;
  }

  // Validar prefijos (Los RUCs en Perú inician con estos números)
  const prefix = parseInt(rucStr.substring(0, 2));
  const validPrefixes = [10, 15, 16, 17, 20];
  
  if (!validPrefixes.includes(prefix)) {
    return false;
  }

  // Validar dígito verificador usando el Algoritmo del Módulo 11 para SUNAT
  // Estos son los factores oficiales para los primeros 10 dígitos
  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;

  // Iteramos sobre los primeros 10 dígitos
  for (let i = 0; i < 10; i++) {
    sum += parseInt(rucStr[i]) * factors[i];
  }

  // Calculamos el residuo
  const remainder = sum % 11;
  
  // Calculamos el dígito verificador esperado
  let checkDigit = 11 - remainder;

  // Reglas especiales para el resultado de la resta:
  // Si sale 10, el dígito es 0. Si sale 11, el dígito es 1.
  if (checkDigit === 10) {
    checkDigit = 0;
  } else if (checkDigit === 11) {
    checkDigit = 1;
  }

  // Comparar con el último dígito del RUC ingresado
  const lastDigit = parseInt(rucStr[10]);

  return checkDigit === lastDigit;
}
