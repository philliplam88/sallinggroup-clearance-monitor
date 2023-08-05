export type FoodwasteResponse = Foodwaste[];

export interface FoodwasteErrorResponse {
  developerMessage: string;
  errorCode: number;
  moreInfo?: string;
  userMessage: string;
}

export interface Foodwaste {
  clearances: Clearance[];
  store: Store;
}

export interface Clearance {
  offer: Offer;
  product: Product;
}

export interface Offer {
  currency: string;
  discount: number;
  ean: string;
  endTime: string;
  lastUpdate: string;
  newPrice: number;
  originalPrice: number;
  percentDiscount: number;
  startTime: string;
  stock: number;
  stockUnit: string;
}

export interface Product {
  categories: Categories;
  description: string;
  ean: string;
  image: string;
}

export interface Categories {
  da: string;
  en: string;
}

export interface Store {
  address: Address;
  brand: string;
  coordinates: number[];
  hours: Hour[];
  name: string;
  id: string;
  type: string;
}

export interface Address {
  city: string;
  country: string;
  street: string;
  zip: string;
}

export interface Hour {
  close: string;
  closed: boolean;
  date: string;
  open: string;
  type: string;
  customerFlow: number[];
}
