export const CREATE_USER_DEFAULT = {
  PHONE_CODE: '+84',
  IS_ACTIVE: false,
  IS_FIRST_LOGIN: true,
  PASSWORD_CRITERIA: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\W|_)(?=.*\d).*$/g,
  SALT_HASH: 10,
  ACTIVATION_CODE_LENGTH: 16,
};

export enum StatusUser {
  true = "active",
  false = "inactive"
}
