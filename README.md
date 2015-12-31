Setting up
==========

Pencil uses [Atom Eletron](http://electron.atom.io/) as the runtime, follow the these steps to setup the environment:

* Clone this repository
* Make sure you are using *nodejs 4.2+*
* Install dependencies:

    ```bash
    $ npm install
    ```

* Rebuilding native modules for Eletron:

    ```bash
    $ ./node_modules/.bin/eletron_rebuild
    ```

* Start Pencil using the prebuilt version of Eletron

    ```bash
    $ ./node_modules/.bin/electron .
    ```
