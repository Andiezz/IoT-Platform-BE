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
};

export const PARAMETER_WEIGHT = {
  co: 3,
  ch4: 0,
  'pm2.5': 2,
  pm10: 0,
  co2: 2,
  humidity: 1,
  temperature: 1,
  nh4: 0,
  tvoc: 1,
};

export const PARAMETER_THRESHOLD = {
  GOOD: {
    name: 'good',
    min: 0,
    max: 50,
  },
  MODERATE: {
    name: 'moderate',
    min: 50,
    max: 100,
  },
  SENSITIVE_UNHEALTHY: {
    name: 'sensitive-unhealthy',
    min: 100,
    max: 150,
  },
  UNHEALTHY: {
    name: 'unhealthy',
    min: 150,
    max: 200,
  },
  VERT_UNHEALTHY: {
    name: 'very-unhealthy',
    min: 200,
    max: 300,
  },
  HARZARDOUS: {
    name: 'harzardous',
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
