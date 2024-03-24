import {
  AsyncTemplateFunction,
  ClientFunction,
  compile,
  TemplateFunction,
} from 'ejs';

import {
  MailerTemplateEngine,
  TemplateOptions,
} from '../interfaces/template-engine.interface';

import { basename, dirname, extname, isAbsolute, join, relative } from 'path';
import { readFileSync } from 'fs';

export class EjsEngine implements MailerTemplateEngine {
  private cached: {
    [name: string]: TemplateFunction | AsyncTemplateFunction | ClientFunction;
  } = {};

  private cfg: {
    baseDir: string;
  } = {
    baseDir: '/',
  };

  constructor(config: { baseDir: string }) {
    this.cfg = {
      ...this.cfg,
      ...config,
    };
  }

  public async compile(option: TemplateOptions): Promise<string> {
    try {
      const { context, path, options } = option;
      const templateExt = extname(path) || '.ejs';
      let templateName = basename(path, extname(path));
      const templateDir = isAbsolute(path)
        ? dirname(path)
        : join(this.cfg.baseDir, dirname(path));
      const templatePath = join(templateDir, templateName + templateExt);
      templateName = relative(this.cfg.baseDir, templatePath).replace(
        templateExt,
        '',
      );
      if (!this.cached[templateName]) {
        const template = readFileSync(templatePath, 'utf-8');
        this.cached[templateName] = compile(template, {
          ...(options || {}),
          filename: templatePath,
        });
      }
      const renderedData = this.cached[templateName](context);
      return await renderedData;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
