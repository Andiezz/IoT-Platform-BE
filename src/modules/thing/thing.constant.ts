export enum PARAMETER_NAME {
  PM25 = 'PM2.5',
  PM10 = 'PM10',
  CO2 = 'CO2',
  Temp = 'Temperature',
  Humi = 'Humidity',
  LPG = 'LPG',
  CH4 = 'CH4',
  CO = 'CO',
  Alcohol = 'Alcohol',
  Toluen = 'Toluen',
  NH4 = 'NH4',
  Aceton = 'Aceton',
  TVOC = 'TVOC'
};

export const PARAMETER_WEIGHT = {
  co: 3,
  'pm2.5': 3,
  pm10: 2,
  co2: 0,
  humidity: 0,
  temperature: 0,
  tvoc: 2,
};

export interface IParameterThreshold {
  name: string;
  min: number;
  max: number;
}

export const PARAMETER_THRESHOLD = {
  GOOD: {
    name: 'good',
    color: 'green',
    min: 0,
    max: 50,
  },
  MODERATE: {
    name: 'moderate',
    color: 'yellow',
    min: 50,
    max: 100,
  },
  SENSITIVE_UNHEALTHY: {
    name: 'sensitive-unhealthy',
    color: 'orange',
    min: 100,
    max: 150,
  },
  UNHEALTHY: {
    name: 'unhealthy',
    color: 'red',
    min: 150,
    max: 200,
  },
  VERY_UNHEALTHY: {
    name: 'very-unhealthy',
    color: 'purple',
    min: 200,
    max: 300,
  },
  HAZARDOUS: {
    name: 'hazardous',
    color: 'brown',
    min: 300,
    max: 500,
  },
};

export enum PARAMETER_THRESHOLD_NAME {
  GOOD = 'good',
  MODERATE = 'moderate',
  SENSITIVE_UNHEALTHY = 'sensitive-unhealthy',
  UNHEALTHY = 'unhealthy',
  VERT_UNHEALTHY = 'very-unhealthy',
  HARZARDOUS = 'harzardous',
}

export const getParameterThreshold = (generalIaqi: number) => {
  for (let threshold in PARAMETER_THRESHOLD) {
    if (generalIaqi >= PARAMETER_THRESHOLD[threshold].min && generalIaqi <= PARAMETER_THRESHOLD[threshold].max) {
      return PARAMETER_THRESHOLD[threshold] as IParameterThreshold;
    }
  }
}
