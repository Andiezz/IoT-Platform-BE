export class EvaluatedParameter {
  name: string;
  value: number;
  unit: string;
  threshold: {
    name: string;
    color: string;
    min: number;
    max: number;
  };
  type?: string;
}
