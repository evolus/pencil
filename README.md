
About The Next Version
==========

Pencil V3 is a rewrite of Pencil that aims to fix major performance and scalability issues of the application. The new version is under heavy development and we are expecting GA builds in June. The following list summarizes important changes in the new version:

  * Pencil V3 uses Electron instead of Mozilla XULRunner as the runtime. We expect that by moving into this Nodejs-based environment, the Pencil source code can be much easier for all fellow developers to play with. The fact that Mozilla XULRunner is outdated is also a reason for the movement.
  * A new, zip-based file format was introduced to support large documents and better embedding of external bitmaps/resources.
  * A new mechanism for page management that dramatically reduces memory usage for large documents.
  * Document pages can now be structured into a tree-like model.
  * New UI approach


Setting up
==========

Pencil uses [Atom Electron](http://electron.atom.io/) as the runtime, follow the these steps to setup the environment:

  * Clone this repository
  * Make sure you are using *nodejs 4.2+*
  * Install dependencies:

      ```bash
      $ npm install
      ```
  * Start Pencil using the prebuilt version of Electron

      ```bash
      $ npm start
    ```
