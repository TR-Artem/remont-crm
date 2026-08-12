// Единый источник паролей для демо-сотрудников — используется и seed.ts (при первом
// заполнении базы), и update-passwords.ts (для смены паролей в уже существующей базе).
// Смените значения здесь, если нужно сгенерировать новый набор паролей.
export const DEMO_PASSWORDS: Record<string, string> = {
  director: "sTkt#YTrYc2ZsS",
  regional: "eYa9FcEMmQ!Ahf",
  admin: "h#Fj2RLGnML6Hn",
  callcenter: "qkQq4EyLfyuiBm",
  master1: "hHMF4u3UY%xXKq",
  master2: "Z48m6ZJPBFu34m",
};
