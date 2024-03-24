
export type EngineContext = Record<any, any>;
export interface TemplateOptions {
  path: string,
  context: EngineContext,
  options: any
}

export interface MailerTemplateEngine{
  compile(option: TemplateOptions): Promise<string>;
}