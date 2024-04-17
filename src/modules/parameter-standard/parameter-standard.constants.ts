import { EvaluatedParameter } from 'src/shared/dto/request/notification/create.request';
import { PARAMETER_THRESHOLD } from '../thing/thing.constant';
import { Threshold } from 'src/shared/models/parameter-standard.model';

/*
  Problem:
    If parameter belongs to range 1: from x to y
    AQI belongs to range 2: from a to b
    and the value is v in range 1
  -> range 1 fit into range 2, calculate the value v in range 2
*/
export const convertParameterValueToIAQI = (parameter: EvaluatedParameter) => {
  // skip value that can not be converted to IAQI
  if (parameter.weight === 0) {
    return parameter.value;
  }

  let threshold: Threshold;
  for (let t in PARAMETER_THRESHOLD) {
    const tLower = t.toLowerCase().replace('_', '-');
    if (tLower === parameter.threshold.name) {
      threshold = PARAMETER_THRESHOLD[t];
      break;
    }
  }

  const x = parameter.threshold.min;
  const y = parameter.threshold.max;
  const a = threshold.min;
  const b = threshold.max;

  const v = parameter.value;

  const percentageOfRange2 = (((v - x) / (y - x)) * 100) / 100;
  const valueInRange1 = (percentageOfRange2 / 100) * (b - a);
  const iaqi = a + valueInRange1;
  return iaqi;
};

/*
  Calculation:
    s = Sum of all IAQI mutiplied by its weight
    w = Sum of all weights
    overallIAQI = s / w
*/
export const calculateOverallIndoorAirQualityIndex = (
  parameters: EvaluatedParameter[],
) => {
  let s = 0;
  let w = 0;
  parameters.forEach((parameter) => {
    const { iaqiValue, weight } = parameter;
    if (iaqiValue && weight) {
      s += iaqiValue * weight;
      w += weight;
    }
  });
  if (w === 0) {
    return null;
  }
  const overallIAQI = s / w;
  return overallIAQI;
};
