import { createOgImageResponse } from "./og-image";

export const alt = "CHAOS / Attendance Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return createOgImageResponse();
}
