export const PARAMETER_NAME = {
  PM25: 'PM2.5',
  PM10: 'PM10',
  CO2: 'CO2',
  Temp: 'Temperature',
  Humi: 'Humidity',
  LPG: 'LPG',
  CH4: 'CH4',
  CO: 'CO',
  Alcohol: 'Alcohol',
  Toluen: 'Toluen',
  NH4: 'NH4',
  Aceton: 'Aceton',
};

export const PARAMETER_WEIGHT = {
  co: 3,
  ch4: 0,
  'pm2.5': 2,
  'pm10': 0,
  co2: 2,
  humidity: 1,
  temperature: 1,
  nh4: 0,
  tvoc: 1,
};

export const PARAMETER_MESSAGE = {
  ABOVE_STANDARD: 'above-standard',
  BELOW_STANDARD: 'below-standard',
  STANDARD: 'standard',
};
