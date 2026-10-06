"use client";

import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CameraOff, PenLine, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui";
import { barcodeFoodId, createBarcodeDetector, lookupBarcode } from "@/lib/barcode";
import type { FoodItem } from "@/types";

type Status = "starting" | "scanning" | "blocked" | "looking" | "missing" | "error";

const statusText: Partial<Record<Status, string>> = {
  starting: "Abriendo la cámara…",
  looking: "Buscando el producto…",
};

/**
 * Escanea el código de barras de un envase con la cámara (o se escribe a mano) y busca el producto
 * en Open Food Facts. Lo ya escaneado antes se encuentra sin conexión en «Mis alimentos».
 */
export function BarcodeScanner({ known, onBack, onFound, onCreate }: {
  known: FoodItem[];
  onBack: () => void;
  onFound: (food: FoodItem) => void;
  /** No está en la base: crearlo a mano con su código. */
  onCreate: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(true);
  const [status, setStatus] = useState<Status>("starting");
  const [code, setCode] = useState("");
  const [typed, setTyped] = useState("");
  const lookup = useRef<AbortController | null>(null);

  async function find(raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (clean.length < 8) return;
    setScanning(false);
    setCode(clean);
    const saved = known.find((food) => food.id === barcodeFoodId(clean));
    if (saved) {
      onFound(saved);
      return;
    }
    setStatus("looking");
    lookup.current?.abort();
    const controller = new AbortController();
    lookup.current = controller;
    const result = await lookupBarcode(clean, controller.signal);
    if (controller.signal.aborted) return;
    if (result.status === "found") onFound(result.food);
    else setStatus(result.status);
  }

  const detected = useEffectEvent((value: string) => {
    navigator.vibrate?.(30);
    void find(value);
  });

  useEffect(() => {
    if (!scanning) return;
    let alive = true;
    let stream: MediaStream | null = null;
    let timer = 0;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("sin cámara");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        const video = videoRef.current;
        if (!alive || !video) return;
        video.srcObject = stream;
        await video.play();
        const detector = await createBarcodeDetector();
        if (!alive) return;
        setStatus("scanning");
        const tick = async () => {
          if (!alive) return;
          try {
            const [hit] = await detector.detect(video);
            if (alive && hit?.rawValue) {
              detected(hit.rawValue);
              return;
            }
          } catch {
            // Cuadro aún sin imagen: se reintenta.
          }
          timer = window.setTimeout(tick, 180);
        };
        void tick();
      } catch {
        if (alive) setStatus("blocked");
      }
    })();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning]);

  useEffect(() => () => lookup.current?.abort(), []);

  function scanAgain() {
    setStatus("starting");
    setCode("");
    setScanning(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void find(typed);
  }

  const camera = status === "starting" || status === "scanning";
  const typedValid = typed.replace(/\D/g, "").length >= 8;

  return (
    <div className="nut-picker nut-scan">
      <button type="button" className="link-button nut-back" onClick={onBack}><ArrowLeft size={15} />Volver</button>
      <div className="nut-detail-head">
        <h3 className="title-m">Escanear código</h3>
        <p className="muted">Apunta al código de barras del envase.</p>
      </div>

      <div className="scan-frame" data-status={status}>
        <video ref={videoRef} playsInline muted autoPlay aria-hidden="true" hidden={!camera} />
        {camera && <span className="scan-guide" aria-hidden="true" />}
        {statusText[status] && <p className="scan-status" role="status">{statusText[status]}</p>}
        {status === "blocked" && (
          <div className="scan-blocked">
            <CameraOff size={26} aria-hidden="true" />
            <p>No pudimos abrir la cámara. Revisa el permiso en tu navegador o escribe el número del código.</p>
          </div>
        )}
        {(status === "missing" || status === "error") && (
          <div className="scan-blocked" role="alert">
            <p className="num scan-code">{code}</p>
            <p>{status === "missing" ? "No encontramos este producto. Puedes crearlo con los datos de la etiqueta." : "No pudimos buscarlo. Revisa tu conexión e intenta de nuevo."}</p>
          </div>
        )}
      </div>

      {status === "missing" && (
        <div className="scan-actions">
          <Button onClick={() => onCreate(code)}><PenLine size={16} />Crear alimento</Button>
          <Button variant="secondary" onClick={scanAgain}><RotateCcw size={16} />Escanear otro</Button>
        </div>
      )}
      {status === "error" && (
        <div className="scan-actions">
          <Button onClick={() => void find(code)}><RotateCcw size={16} />Reintentar</Button>
          <Button variant="secondary" onClick={scanAgain}>Escanear otro</Button>
        </div>
      )}

      <form className="scan-manual" onSubmit={submit}>
        <label className="picker-search">
          <Search size={18} aria-hidden="true" />
          <input inputMode="numeric" name="pulso-codigo" autoComplete="off" enterKeyHint="search" value={typed} onChange={(event) => setTyped(event.target.value.replace(/[^\d\s]/g, "").slice(0, 16))} placeholder="O escribe el número" aria-label="Número del código de barras" />
        </label>
        <Button type="submit" variant="secondary" disabled={!typedValid || status === "looking"}>Buscar</Button>
      </form>
      <p className="scan-source">Datos de Open Food Facts, una base abierta hecha por personas: revisa que coincidan con la etiqueta.</p>
    </div>
  );
}
