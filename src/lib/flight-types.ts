export type FlightSegment = {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  departureId: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalId: string;
  arrivalTime: string;
  duration: number;
};

export type FlightDeal = {
  key: string;
  kind: "exact" | "explore";
  title: string;
  outboundDate: string;
  returnDate: string;
  origin: string;
  originId: string;
  destination: string;
  destinationId: string;
  price: number;
  currency: string;
  adults: number;
  airlines: string[];
  flightNumbers: string[];
  totalDuration: number;
  stops: number;
  segments: FlightSegment[];
  link?: string;
  observedAt: string;
};
