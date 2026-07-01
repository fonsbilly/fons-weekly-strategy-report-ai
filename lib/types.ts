export type UserRole = "rvp" | "director";
export type Branch = "detroit" | "grand_rapids" | "indianapolis";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch: Branch | null;
  is_active: boolean;
}
