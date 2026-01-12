import { getApiBaseUrl } from "./env";

export type MealDayKey = "J1" | "J2" | "J3";

export type MealDay = {
  key: MealDayKey;
  label: string;
  dateTime: string | null;
  message?: string | null;
};

export type MealsResponse = {
  days: MealDay[];
  mealOfDay: MealDay | null;
};

const API_BASE_URL = getApiBaseUrl();

export async function fetchMeals(): Promise<MealsResponse> {
  const res = await fetch(`${API_BASE_URL}/meals`);
  if (!res.ok) throw new Error("Erreur lors du chargement des repas");
  return res.json();
}
