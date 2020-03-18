dotenvrc
========

dotenvrc loads environment variables from a [`.envrc`][] file into [`process.env`][].

[`.envrc`]: https://direnv.net/
[direnv]: https://direnv.net/
[`process.env`]: https://nodejs.org/docs/latest/api/process.html#process_process_env


Motivation
----------

In short, I wanted [`jest`][] to use environment variables written in a `.envrc`.

At the writing moment, `jest` [seems to run in a sandboxed environment][], i.e. it omits
runtime environment variables. Since I'm a big fan of [The Twelve-Factor App][] and [direnv][],
I wanted to keep the _single source of truth theory_.

[`jest`]: https://jestjs.io/
[seems to run in a sandboxed environment]: https://github.com/vuejs/vue-test-utils/issues/193
[The Twelve-Factor App]: http://12factor.net/config


Goal
----

To have the same result of what [direnv][] does in popular and/or realistic use cases.  
In this sense, `function` or shell command execution would be out of support.

Features
--------

- local variable assignment
- Supports `export`
- Supports `export -n` (un-export)
- Supports several backslash notations
    - `\xXX`: ASCII hex code
    - `\uXXXX`: 4 digits unicode
    - `\UXXXXXXXX`: 8 digits unicode
    - `\n`, `\r`, `\t`, `\v`, `\b`, `\a`
- Supports parameter expansion
    - `$VAR`
    - `${VAR}`
- Especially treats `$PWD`. `$PWD` is expanded to the directory where `.envrc` found.

Not supported
-------------
- Other than a simple variable assignment and `export`.
    - Shell command execution
    - Arithmetic expansion
    - Shell history expansion
    - A series of variable calculation e.g. `${#var}`, `${var:-val}`, etc.


[bash-parser]: https://github.com/vorpaljs/bash-parser

Install
-------

```shell
npm install dotenvrc
```

Usage
-----

To inject [`.envrc`][] content into [`process.env`], simply:

```javascript
require('dotenvrc');
```

If you have [`.env`][] file instead of `.envrc`, the following might work for you. (It might not since the Parsing rules are different.)

```javascript
require('dotenvrc/dotenv').inject()
```


[`.env`]: https://github.com/motdotla/dotenv

Example `.envrc` file
---------------------

    # Firebase/GCP
    export BOTO_CONFIG=$PWD/.boto
    export GOOGLE_APPLICATION_CREDENTIALS=$PWD/secret/goog-credencials.json

    # Cloud Datastore emulator
    PORT=18081
    export DATASTORE_EMULATOR_PORT=$PORT
    export DATASTORE_EMULATOR_HOST=http://localhost:$PORT


LICENSE
-------

MIT
