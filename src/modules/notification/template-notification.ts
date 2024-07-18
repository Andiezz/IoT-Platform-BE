import { EvaluatedParameter } from 'src/shared/dto/request/notification/create.request';
import { convertParameterValueToIAQI } from '../parameter-standard/parameter-standard.constants';

export const TITLE = {
  EXCEED_THRESHOLD: 'Parameters in warning threshold',
};

// $1: thingId
// $2: Parameter - 'Threshold name': IAQI\n -> Ex: PM2.5 - Good: 30
export const CONTENT = {
  WARNING_THRESHOLD: `<p>Thing <strong>$1</strong> has the following parameters being in warning threshold:</p>
    <ul>
      $2
    </ul>
    You should:
    <ul>
      $3
    </ul>`,
};

export const TYPE = {
  WARNING: 'Warning',
  NORMAL: 'Normal',
};

export const formatTemplateContentArgument = (
  parameters: EvaluatedParameter[],
) => {
  let argument = '';
  parameters.forEach((parameter) => {
    argument += formatParameterContent(parameter);
  });
  return argument;
};

export const formatParameterContent = (parameter: EvaluatedParameter) => {
  const parameterName = parameter.name;
  const parameterThreshold =
    parameter.threshold.name.charAt(0).toUpperCase() +
    parameter.threshold.name.slice(1);
  const iaqiValue = convertParameterValueToIAQI(parameter);
  return `<li><strong>${parameterName}</strong> - ${parameterThreshold}: ${iaqiValue}</li>`;
};

export const formatTemplateContentRecommendationActions = (
  parameters: EvaluatedParameter[],
) => {
  let actions = '';
  parameters.forEach((parameter) => {
    actions += formatRecommendationActionsContent(parameter);
  });
  return actions;
};

export const formatRecommendationActionsContent = (parameter: EvaluatedParameter) => {
  const parameterName = parameter.name;
  const recommendationAction = RECOMMENDATION_ACTIONS[parameterName];
  return `<li>${recommendationAction}</li>`;
};

export const RECOMMENDATION_ACTIONS = {
  CO2: 'Open the window to let fresh air in',
  'PM2.5': 'Use an air purifier or open the window to let fresh air in',
  PM10: 'Use an air purifier or open the window to let fresh air in',
  CO: 'Turn off the gas stove or open the window to let fresh air in',
  CH4: 'Turn off the gas stove or open the window to let fresh air in',
  LPG: 'Turn off the gas stove or open the window to let fresh air in',
  TVOC: 'Open the window to let fresh air in',
  Humidity: 'Use a dehumidifier or an air conditioner',
  Temperature: 'Use an air conditioner or a fan',
  Alcohol: 'Open the window to let fresh air in',
  Toluen: 'Open the window to let fresh air in',
  NH4: 'Open the window to let fresh air in',
  Aceton: 'Open the window to let fresh air in',
}
