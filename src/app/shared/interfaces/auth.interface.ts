export interface LoginRequest {
  Login_Name: string;
  Password: string;
}

export interface CustomerAccount {
  SerialNo: string;
  CustomerName: string;
}

export interface User {
  ID: number;
  TaxType: number;
  SystemType: number;
  IsReseller: boolean;
  DeliveryName: string;
  DatabaseName: string;
  DeliveryID: number;
  CustomerAccounts: CustomerAccount[];
  Roles: string[];
  Permissions: string[];
}

export interface LoginResponse {
  ID: number;
  TaxType: number;
  SystemType: number;
  IsReseller: boolean;
  DeliveryName: string;
  DatabaseName: string;
  DeliveryID: number;
  CustomerAccounts: CustomerAccount[];
  Roles: string[];
  Permissions: string[];
  Token: string;
}