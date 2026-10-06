import { firebaseConfig } from "@/lib/cloud/config";

/**
 * Puente al inicio de sesión de Firebase: /__/auth/* y /__/firebase/* se piden a firebaseapp.com y se
 * devuelven desde el dominio de PULSO. Así Safari no bloquea la vuelta de Google (mismo dominio), como
 * recomienda Firebase para navegadores que bloquean el almacenamiento de terceros.
 */
export async function proxyFirebaseAuth(request: Request) {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, `https://${firebaseConfig.authDomain}`);
  const headers = new Headers(request.headers);
  for (const name of ["host", "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor", "x-forwarded-proto", "x-real-ip"]) headers.delete(name);
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    redirect: "manual",
  });
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: upstream.headers });
}
