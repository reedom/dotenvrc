import * as fs from 'fs'
import * as path from 'path'

export const findFile = ({
  pwd = process.env.PWD,
  filename = '.envrc'
}: {
  pwd?: string,
  filename: string
}): {
  dir: string,
  content: string
} | null => {
  function loop(dir: string, sentinel: number): { dir: string, content: string } | null {
    const filePath = path.join(dir, filename);

    if (fs.existsSync(filePath)) {
      return { dir, content: fs.readFileSync(filePath).toString() };
    }

    if (--sentinel <= 0) {
      // Possibly it's in infinite directory recursion loop.
      // To prevent freeze the program, just give up.
      return null;
    }

    const parentDir = path.join(dir, '..');
    if (parentDir === dir) {
      console.log('give up:', parentDir);
      // Possibly at the root dir.
      return null;
    }

    return loop(parentDir, sentinel);
  }

  return loop(pwd || process.cwd(), 100);
};
