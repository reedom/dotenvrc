import ProcessEnv = NodeJS.ProcessEnv;
import { findFile } from './internal/findFile';
import { parseEnvContent } from './internal';

export function parse(config?: EnvConfig): ProcessEnv {
  const filename = config?.filename || '.env';

  const ret = findFile({ filename });
  if (!ret) {
    console.warn(`${filename} not found`);
    return {};
  }
  const { dir, content } = ret;
  return parseEnvContent(content, { cwd: dir, predefined: process.env, exportedOnly: false });
}

export function inject(config?: EnvConfig) {
  Object.assign(process.env, parse(config));
}
