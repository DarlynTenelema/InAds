import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/constants/config";

export default function HomePage() {
  redirect(APP_ROUTES.AUTH);
}

