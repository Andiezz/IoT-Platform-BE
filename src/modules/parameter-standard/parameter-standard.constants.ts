import { EvaluatedParameter } from "src/shared/dto/request/notification/create.request"
import { PARAMETER_THRESHOLD } from "../thing/thing.constant";

/*
  Problem:
    If parameter belongs to range 1: from x to y
    AQI belongs to range 2: from a to b
    and the value is v in range 1
  -> range 1 fit into range 2, calculate the value v in range 2
*/
export const convertParameterValueToIAQI = (parameter: EvaluatedParameter) => {
  const x = parameter.threshold.min;
  const y = parameter.threshold.max;
  const a = PARAMETER_THRESHOLD[`${parameter.threshold.name.toUpperCase().replace('-', '_')}`].min;
  const b = PARAMETER_THRESHOLD[`${parameter.threshold.name.toUpperCase().replace('-', '_')}`].max;
  const v = parameter.value;

  const percentageOfRange2 = (((v - x) / (y - x)) * 100) / 100;
  const valueInRange1 = (percentageOfRange2 / 100) * (b - a);
  const iaqi = a + valueInRange1;
  return iaqi;
}