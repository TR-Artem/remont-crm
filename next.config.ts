import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 по умолчанию блокирует dev-запросы не с localhost — если открывать
  // приложение по сетевому IP (как в выводе `npm run dev`: Network: http://172.x.x.x:3000),
  // авторизация и API могут молча не работать. Разрешаем оба стандартных локальных адреса.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
