export type ClientConfig = {
  id: string;
  name: string;
  state: string;
  stateCode: string;
  adAccountId: string;
  tag: string;
  saleValue: number;
  feePerSale: number;
  calendars: {
    english: string;
    spanish: string;
  };
};

export const CLIENTS: ClientConfig[] = [
  {
    id: "aaron-yuliana",
    name: "Aaron y Yuliana",
    state: "South Carolina",
    stateCode: "SC",
    adAccountId: "act_751411627703795",
    tag: "sc leads - a&y",
    saleValue: 3000,
    feePerSale: 750,
    calendars: {
      english: "ksBZDfOVUbwMlL6c0AgH",
      spanish: "2Gja6y6mmj4V3W0CWVd9",
    },
  },
  {
    id: "jorge",
    name: "Jorge Martinez",
    state: "Virginia",
    stateCode: "VA",
    adAccountId: "act_1423143898800903",
    tag: "va leads - jorge",
    saleValue: 3000,
    feePerSale: 750,
    calendars: {
      english: "ImaRbxTlxH8DyAVSiRMw",
      spanish: "bAZDUQag791K6vZAymyq",
    },
  },
  {
    id: "fernando",
    name: "Fernando Duque",
    state: "Maryland",
    stateCode: "MD",
    adAccountId: "act_795631173072316",
    tag: "md leads - fernando",
    saleValue: 2800,
    feePerSale: 500,
    calendars: {
      english: "23pvb7XTyENFdqu5fygX",
      spanish: "0xtLCIEwab3yszAry0YQ",
    },
  },
  {
    id: "danelly",
    name: "Danelly Dacos",
    state: "North Carolina",
    stateCode: "NC",
    adAccountId: "act_1569261187694774",
    tag: "nc leads - danelly",
    saleValue: 3000,
    feePerSale: 750,
    calendars: {
      english: "jr5yVUnpptpl7qsuwcrf",
      spanish: "Kei59Zx6HpJCZdpSpYDN",
    },
  },
];

export function getClientById(id: string) {
  return CLIENTS.find((c) => c.id === id);
}