import QRCode from "qrcode";

export async function challengeQrSvg(url: string) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#121725", light: "#ffffff" },
  });
  if (!svg.startsWith("<svg")) throw new Error("QR SVG was not produced.");
  return svg.replace("<svg ", '<svg role="img" aria-label="QR code for this check" ');
}
