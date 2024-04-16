export class EvaluatedParameter {
  name: string;
  value: number;
  unit: string;
  weight: number;
  threshold: {
    name: string;
    color: string;
    min: number;
    max: number;
  };
  type: string;
  iaqiValue?: number;
}
