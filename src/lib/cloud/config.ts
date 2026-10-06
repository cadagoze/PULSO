/**
 * Configuración pública del proyecto de Firebase de PULSO. No es secreta: identifica el proyecto y
 * va dentro de la app; lo que protege los datos son las reglas de Firestore (firestore.rules).
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBCT6SnXZ3XT8cV3jmIgOL6aHk43aWcu70",
  authDomain: "pulso-ac82a.firebaseapp.com",
  projectId: "pulso-ac82a",
  storageBucket: "pulso-ac82a.firebasestorage.app",
  messagingSenderId: "794554909392",
  appId: "1:794554909392:web:ae00c7eb08a4d1e2e094d5",
};

/** Dirección pública de PULSO: ahí el Worker hace de puente con el inicio de sesión de Firebase (/__/auth). */
export const APP_HOST = "pulso.c-gonzalezzepeda.workers.dev";

/**
 * Iniciar sesión desde el mismo dominio de la app. Safari (y la app instalada en iPhone) bloquea la
 * comunicación con firebaseapp.com y el inicio con Google se queda pegado; desde el propio dominio no.
 * Requiere que https://APP_HOST/__/auth/handler esté autorizada en el cliente OAuth de Google Cloud.
 */
export const SAME_DOMAIN_AUTH = true;

/** Dominio de inicio de sesión según dónde corre la app (en local, el de Firebase). */
export function authDomainFor(host: string) {
  return SAME_DOMAIN_AUTH && host === APP_HOST ? APP_HOST : firebaseConfig.authDomain;
}
