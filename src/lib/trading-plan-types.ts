export type TradingPlanSection = {
  id: string;
  heading: string;
  body: string;
};

export type TradingPlan = {
  title: string;
  // Order is preserved by the array order.
  sections: TradingPlanSection[];
};

