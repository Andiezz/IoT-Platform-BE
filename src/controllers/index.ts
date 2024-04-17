// Export all controllers as single array to import in App.module.

import { AuthenticationController } from './authentication/authentication.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { DeviceModelController } from './device-model/device-model.controller';
import { HealthController } from './health.controller';
import { NotificationController } from './notification/notification.controller';
import { ParameterStandardController } from './parameter-standard/parameter-standard.controller';
import { SystemManagementController } from './system-management/system-management.controller';
import { ThingController } from './thing/thing.controller';
import { UserManagementController } from './user-management/user-management.controller';
import { UserController } from './user/user.controller';

export default [
  HealthController,
  AuthenticationController,
  SystemManagementController,
  UserManagementController,
  UserController,
  ThingController,
  NotificationController,
  DashboardController,
  ParameterStandardController,
  DeviceModelController,
];
