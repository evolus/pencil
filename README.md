Setting up
==========

Pencil uses [Atom Electron](http://electron.atom.io/) as the runtime, follow the these steps to setup the environment:

* Clone this repository
* Make sure you are using *nodejs 4.2+*
* Install dependencies:

    ```bash
    $ npm install
    ```

* Rebuilding native modules for Electron:

    ```bash
    $ ./node_modules/.bin/electron-rebuild
    ```

* Start Pencil using the prebuilt version of Electron

    ```bash
    $ ./node_modules/.bin/electron .
    ```
