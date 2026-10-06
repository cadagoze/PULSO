/**
 * Clave pública VAPID de PULSO (identifica al servidor ante los servicios de avisos; es pública por
 * diseño). La privada vive sólo como secreto del Worker (`VAPID_PRIVATE_KEY`).
 */
export const VAPID_PUBLIC_KEY = "BN4BMnN-cawwfvVjadOcHLtit8JGH4FX1gdajTH8xd6ktPy9LZOi9Sj8MqS2evhKzQHDKzYH6eA-yJ9w0h9bac0";

/** Contacto para los servicios de avisos (Google, Apple, Mozilla): la dirección de la app. */
export const VAPID_SUBJECT = "https://pulso.c-gonzalezzepeda.workers.dev";
