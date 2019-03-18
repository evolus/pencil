

Setting up
==========

Pencil uses [Atom Electron](http://electron.atom.io/) as the runtime, follow the these steps to setup the environment:

  * Clone this repository
  * Make sure you are using *nodejs 5+*
  * Install dependencies:

      ```bash
      $ npm install
      ```
  * Start Pencil using the prebuilt version of Electron

      ```bash
      $ npm start
    ```
    
* For use in npm scripts (recommended) 
    ```bash
    npm install electron-packager --save-dev
    ```
 
* For use from the CLI 
    ```bash
    npm install electron-packager -g
    ```

* 打包 win32平台运行包,  --overwrite 覆盖已有的输出
    ```bash
    electron-packager ./app --platform=win32 --arch=x64  --overwrite --asar=true  --icon=./build/icon.ico --prune=true
    ```

* 打包 mac平台运行包, 需在 Mac平台上运行
    ```bash
    electron-packager ./app --overwrite --platform=darwin --arch=x64 --icon=./build/icon.icns
    ```


Supported Platforms
==================

OS X
----

Only OSX 64bit 10.9 and later are supported.

Windows
------

Windows 7 and later are supported, older operating systems are not supported (and do not work).

Linux
-----

* Tested
    * Ubuntu 12.04 and later
    * Fedora 21+
    * Debian 8+
* Packages
    * **Arch Linux** - [pencil](https://aur.archlinux.org/packages/pencil/) on the [Arch User Repository](https://aur.archlinux.org/).
