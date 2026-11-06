export type ServiceRow = {
  code: string; kind: string; title: string;
  amountMajor: number; currency: string; isActive: boolean;
};
export type CardRow = {
  id: string; label: string; cardNumber: string; holderName: string;
  cardType: string; currency: string; isActive: boolean;
};
export type HistoryRow = {
  id: string; serviceCode: string; oldMajor: number | null; newMajor: number;
  currency: string; adminName: string | null; createdAt: string;
};
