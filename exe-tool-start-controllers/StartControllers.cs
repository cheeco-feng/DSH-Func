// StartControllers —— 独立桌面工具（功能集锦式 tab 母体 + 系统托盘 + 开机自启）。
// 顶层三个分页：运行状态总览 / DSH智能体管理(内含各工作台子tab) / NPS端口管理。
// 每个工作台带「一键开关控制」勾选项：勾上才参与「全部启动/全部停止」。
// 底层 tab 壳参照 CheecoStyleTool；托盘/开机自启参照 DSHWebTray；NPS 参照 NpcTray。
// 不依赖 dsh / 不改 dsh 本体；用 csc 编译（见 build.bat）。
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Management;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using Microsoft.Win32;

namespace StartControllers
{
    // ============ 工作台（dsh web 实例）============
    public class Workbench
    {
        public string Name, Profile, Port, Url, Desc, Args;
        public bool Participate = true;   // 是否参与「全部启动/全部停止」（对应「一键开关控制」小勾，持久化到 config）
        public Workbench(string name, string profile, string port, string url, string desc, string args)
        {
            Name = name; Profile = profile; Port = port; Url = url; Desc = desc; Args = args;
        }
        public bool IsRunning() { return Tool.IsPortOpen(Port); }
        public Process[] FindProcesses() { return Tool.FindDshWeb(Port); }
        public bool Start() { return Tool.StartDsh(this); }
        public bool Stop() { return Tool.StopDsh(this); }
        public bool Restart() { try { if (IsRunning()) { if (!Stop()) return false; } return Start(); } catch { return false; } }
        public void OpenBrowser() { try { Process.Start(Url); } catch (Exception ex) { Tool.Log(Name + " 打开浏览器失败：" + ex.Message); } }
        public string StateLabel() { return IsRunning() ? "运行中" : "已停止"; }
    }

    // ============ 配置模型（config.json 反序列化目标；JavaScriptSerializer 大小写不敏感）============
    public class AppConfig
    {
        public PathCfg Paths { get; set; }
        public List<WbCfg> Workbenches { get; set; }
        public NpsCfg Nps { get; set; }
        public UiCfg Ui { get; set; }
    }
    public class UiCfg
    {
        public bool RealtimeMonitor { get; set; }
    }
    public class PathCfg
    {
        public string NodeExe { get; set; }
        public string EngineHome { get; set; }
        public string BinJs { get; set; }
        public string WorkDir { get; set; }
        public string DshHome { get; set; }
        public string NpcDir { get; set; }
    }
    public class WbCfg
    {
        public string Name { get; set; }
        public string Profile { get; set; }
        public string Port { get; set; }
        public string Desc { get; set; }
        public string Args { get; set; }
        public bool Enabled { get; set; }
        public bool? Participate { get; set; }   // 一键开关控制（是否参与全部启动/停止），持久化
    }
    public class NpsCfg
    {
        public bool Enabled { get; set; }
        public bool? Participate { get; set; }   // 一键开关控制，持久化
    }

    // ============ 配置加载/保存（JSON，框架自带 JavaScriptSerializer，零额外依赖）============
    static class Config
    {
        public static string ConfigFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");

        public static AppConfig Load()
        {
            AppConfig cfg = null;
            try
            {
                if (File.Exists(ConfigFile))
                {
                    var jss = new JavaScriptSerializer();
                    cfg = jss.Deserialize<AppConfig>(File.ReadAllText(ConfigFile));
                }
            }
            catch { cfg = null; }
            if (cfg == null) cfg = Defaults();
            Normalize(cfg);
            return cfg;
        }

        public static void Save(AppConfig cfg)
        {
            Normalize(cfg);
            var jss = new JavaScriptSerializer();
            jss.MaxJsonLength = 1024 * 1024;
            File.WriteAllText(ConfigFile, jss.Serialize(cfg), Encoding.UTF8);
        }

        // 内置默认：空占位（去敏——不在二进制里内嵌任何机器路径），真正值来自 config.json
        public static AppConfig Defaults()
        {
            var cfg = new AppConfig();
            cfg.Paths = new PathCfg()
            {
                NodeExe = "",
                EngineHome = "",
                BinJs = "",
                WorkDir = "",
                DshHome = "",
                NpcDir = ""
            };
            cfg.Workbenches = new List<WbCfg>()
            {
                new WbCfg(){ Name="工作台 1 · Web", Profile="web", Port="49982", Desc="主工作台", Args="{binJs} web --port {port} --no-open", Enabled=true }
            };
            cfg.Nps = new NpsCfg() { Enabled = true };
            cfg.Ui = new UiCfg();
            return cfg;
        }

        public static void Normalize(AppConfig cfg)
        {
            if (cfg == null) return;
            if (cfg.Paths == null) cfg.Paths = new PathCfg();
            if (cfg.Workbenches == null) cfg.Workbenches = new List<WbCfg>();
            if (cfg.Nps == null) cfg.Nps = new NpsCfg();
            if (cfg.Ui == null) cfg.Ui = new UiCfg();
            foreach (var w in cfg.Workbenches)
            {
                if (w.Name == null) w.Name = "";
                if (w.Profile == null) w.Profile = "";
                if (w.Port == null) w.Port = "";
                if (w.Desc == null) w.Desc = "";
                if (w.Args == null) w.Args = "";
                if (w.Participate == null) w.Participate = true;
            }
            if (cfg.Nps.Participate == null) cfg.Nps.Participate = true;
        }

        // 公开示例模板（空占位，不含本机路径）
        public static string ExampleTemplate()
        {
            var cfg = new AppConfig();
            cfg.Paths = new PathCfg() { NodeExe = "", EngineHome = "", BinJs = "", WorkDir = "", DshHome = "", NpcDir = "" };
            cfg.Workbenches = new List<WbCfg>()
            {
                new WbCfg(){ Name="工作台 1 · Web", Profile="web", Port="49982", Desc="主工作台", Args="{binJs} web --port {port} --no-open", Enabled=true }
            };
            cfg.Nps = new NpsCfg() { Enabled = true };
            cfg.Ui = new UiCfg();
            var jss = new JavaScriptSerializer();
            return jss.Serialize(cfg);
        }
    }

    // ============ 通用工具：dsh 进程/端口/日志 ============
    static class Tool
    {
        public static string AppDir = AppDomain.CurrentDomain.BaseDirectory;
        public static string NodeExe = "";   // 去敏：值来自 config.json
        public static string BinJs = "";     // 去敏：值来自 config.json
        public static string WorkDir = "";   // 去敏：值来自 config.json
        public static string DshHome = "";   // 去敏：值来自 config.json
        public static string LogFile = Path.Combine(AppDir, "start-controllers.log");

        // 启动时用配置覆盖机器专属路径
        public static void InitFromConfig(AppConfig cfg)
        {
            if (cfg == null || cfg.Paths == null) return;
            if (!string.IsNullOrEmpty(cfg.Paths.NodeExe)) NodeExe = cfg.Paths.NodeExe;
            if (!string.IsNullOrEmpty(cfg.Paths.WorkDir)) WorkDir = cfg.Paths.WorkDir;
            if (!string.IsNullOrEmpty(cfg.Paths.DshHome)) DshHome = cfg.Paths.DshHome;
            if (!string.IsNullOrEmpty(cfg.Paths.BinJs)) BinJs = cfg.Paths.BinJs;
            else if (!string.IsNullOrEmpty(cfg.Paths.EngineHome))
                BinJs = Path.Combine(cfg.Paths.EngineHome, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");
        }

        // 展开工作台启动命令里的占位符（去敏：不在源码里硬编码路径）
        public static string BuildArgs(string template, WbCfg w)
        {
            if (string.IsNullOrEmpty(template)) return template;
            return template
                .Replace("{binJs}", "\"" + BinJs + "\"")
                .Replace("{profile}", w.Profile == null ? "" : w.Profile)
                .Replace("{port}", w.Port == null ? "" : w.Port);
        }

        // ---- 环境检测（设置页「自动检测环境」调用；仅供回填，不强制生效）----
        public static string DetectNodeExe()
        {
            try
            {
                var p = new Process();
                p.StartInfo.FileName = "cmd.exe";
                p.StartInfo.Arguments = "/c where node";
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.CreateNoWindow = true;
                p.StartInfo.RedirectStandardOutput = true;
                p.Start();
                string o = p.StandardOutput.ReadToEnd();
                p.WaitForExit();
                foreach (var line in o.Split(new[]{'\r','\n'}, StringSplitOptions.RemoveEmptyEntries))
                {
                    string t = line.Trim();
                    if (t.Length > 0 && File.Exists(t)) return t;
                }
            }
            catch { }
            string[] common = {
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "node.exe")
            };
            foreach (var c in common) if (File.Exists(c)) return c;
            return "";
        }

        public static string DetectDshHome()
        {
            string env = Environment.GetEnvironmentVariable("DSH_HOME");
            if (!string.IsNullOrEmpty(env)) return env;
            return DshHome;
        }

        public static string[] DetectProfiles(string dshHome)
        {
            var list = new List<string>();
            try
            {
                if (string.IsNullOrEmpty(dshHome)) return list.ToArray();
                // 真实 dsh 工作台 profile 位于 <DSH_HOME>\profiles\ 子目录下，而非 DSH_HOME 顶层
                string profilesRoot = Path.Combine(dshHome, "profiles");
                string scanDir = Directory.Exists(profilesRoot) ? profilesRoot : dshHome;
                if (Directory.Exists(scanDir))
                {
                    foreach (var d in Directory.GetDirectories(scanDir))
                    {
                        string n = Path.GetFileName(d);
                        if (n == null) continue;
                        if (n.StartsWith(".")) continue;
                        if (n.StartsWith("node_modules", StringComparison.OrdinalIgnoreCase)) continue;
                        list.Add(n);
                    }
                }
            }
            catch { }
            return list.ToArray();
        }

        public static Process[] FindDshWeb(string port)
        {
            var list = new List<Process>();
            try
            {
                using (var searcher = new ManagementObjectSearcher(
                    "SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name = 'node.exe'"))
                {
                    foreach (var o in searcher.Get())
                    {
                        string cmd = Convert.ToString(o["CommandLine"]);
                        if (cmd == null) continue;
                        if (cmd.Contains("bin.js") && cmd.Contains("--port") && cmd.Contains(port))
                        {
                            int pid = Convert.ToInt32(o["ProcessId"]);
                            try { list.Add(Process.GetProcessById(pid)); } catch { }
                        }
                    }
                }
            }
            catch { }
            return list.ToArray();
        }

        public static bool IsPortOpen(string port)
        {
            try
            {
                using (var client = new System.Net.Sockets.TcpClient())
                {
                    var ar = client.BeginConnect("127.0.0.1", int.Parse(port), null, null);
                    bool ok = ar.AsyncWaitHandle.WaitOne(800);
                    if (ok) client.EndConnect(ar);
                    return ok && client.Connected;
                }
            }
            catch { return false; }
        }

        public static bool StartDsh(Workbench w)
        {
            try
            {
                if (w.IsRunning()) { Log(w.Name + " 已在运行"); return true; }
                if (!File.Exists(NodeExe)) { Log(w.Name + " 未找到 node.exe " + NodeExe); return false; }
                var p = new Process();
                p.StartInfo.FileName = NodeExe;
                p.StartInfo.Arguments = w.Args;
                p.StartInfo.WorkingDirectory = WorkDir;
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.CreateNoWindow = true;
                p.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
                p.StartInfo.EnvironmentVariables["DSH_HOME"] = DshHome;
                p.Start();
                for (int i = 0; i < 40; i++) { System.Threading.Thread.Sleep(500); if (w.IsRunning()) { Log(w.Name + " 已开启"); return true; } }
                Log(w.Name + " 启动失败：端口未能就绪（检查 profile 是否存在）");
                return false;
            }
            catch (Exception ex) { Log(w.Name + " 启动异常：" + ex.Message); return false; }
        }

        public static bool StopDsh(Workbench w)
        {
            try
            {
                if (!w.IsRunning()) { Log(w.Name + " 本就未运行"); return true; }
                foreach (var p in w.FindProcesses()) { try { p.Kill(); } catch { } }
                System.Threading.Thread.Sleep(800);
                Log(w.Name + " 已关闭");
                return !w.IsRunning();
            }
            catch (Exception ex) { Log(w.Name + " 关闭异常：" + ex.Message); return false; }
        }

        public static void Log(string msg)
        {
            try { Directory.CreateDirectory(Path.GetDirectoryName(LogFile)); File.AppendAllText(LogFile, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + msg + Environment.NewLine); } catch { }
        }
    }

    // ============ NPS 外网访问（参照 NpcTray：控制 npc.exe）============
    static class Nps
    {
        public static string NpcDir = "";   // 去敏：值来自 config.json
        public static string NpcExe = Path.Combine(NpcDir, "npc.exe");
        public static bool Enabled = true;

        public static void InitFromConfig(AppConfig cfg)
        {
            if (cfg == null) return;
            if (cfg.Paths != null && !string.IsNullOrEmpty(cfg.Paths.NpcDir)) NpcDir = cfg.Paths.NpcDir;
            NpcExe = Path.Combine(NpcDir, "npc.exe");
            if (cfg.Nps != null) Enabled = cfg.Nps.Enabled;
        }

        public static bool IsRunning()
        {
            if (!Enabled || string.IsNullOrEmpty(NpcDir)) return false;
            try { return Process.GetProcessesByName("npc").Length > 0; } catch { return false; }
        }

        public static bool Start()
        {
            try
            {
                if (!Enabled || string.IsNullOrEmpty(NpcDir)) { Log("NPS 未配置/未启用，已跳过；请先在「设置」里填 npc 目录并勾选启用"); return false; }
                if (IsRunning()) { Log("外网访问已在运行中"); return true; }
                if (!File.Exists(NpcExe)) { Log("启动失败：未找到 npc.exe " + NpcExe); return false; }
                var p = new Process();
                p.StartInfo.FileName = NpcExe;
                p.StartInfo.WorkingDirectory = NpcDir;
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.CreateNoWindow = true;
                p.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
                p.Start();
                System.Threading.Thread.Sleep(1200);
                if (IsRunning()) { Log("外网访问已开启"); return true; }
                Log("启动失败：npc 进程未能保持运行");
                return false;
            }
            catch (Exception ex) { Log("NPS 启动异常：" + ex.Message); return false; }
        }

        public static bool Stop()
        {
            try
            {
                if (!IsRunning()) { Log("外网访问本就没有运行"); return true; }
                foreach (var p in Process.GetProcessesByName("npc")) { try { p.Kill(); } catch { } }
                System.Threading.Thread.Sleep(800);
                Log("外网访问已关闭");
                return !IsRunning();
            }
            catch (Exception ex) { Log("NPS 关闭异常：" + ex.Message); return false; }
        }

        public static string ConfigSummary()
        {
            try
            {
                if (!Enabled || string.IsNullOrEmpty(NpcDir)) return "（NPS 未配置）";
                string conf = Path.Combine(NpcDir, "conf", "npc.conf");
                if (!File.Exists(conf)) return "（未找到 conf/npc.conf）";
                foreach (var line in File.ReadAllLines(conf))
                {
                    if (line.StartsWith("server_addr=")) return line.Substring("server_addr=".Length) + "  (nps 服务器)";
                }
                return "（npc.conf 已读取）";
            }
            catch { return "（配置读取失败）"; }
        }

        public static void Log(string msg) { Tool.Log("[NPS] " + msg); }
    }

    // ============ 圆角按钮（自绘：圆角 + 悬停变色）============
    public class RoundedButton : Button
    {
        public int Radius;
        public Color NormalColor;
        public Color HoverColor;
        public Color BaseColor = Color.White;   // 圆角外的底色，用来消除透明残留
        private bool hover;

        public RoundedButton()
        {
            Radius = 12;
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = 0;
            UseVisualStyleBackColor = false;
            DoubleBuffered = true;
            Cursor = Cursors.Hand;
            Font = new Font("Microsoft YaHei", 12F);
            BackColor = Color.White;
        }

        protected override void OnMouseEnter(EventArgs e) { hover = true; Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { hover = false; Invalidate(); base.OnMouseLeave(e); }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            Rectangle r = new Rectangle(0, 0, Width - 1, Height - 1);
            using (var bg = new SolidBrush(BaseColor)) e.Graphics.FillRectangle(bg, this.ClientRectangle);
            using (var path = RoundedPath(r, Radius))
            using (var b = new SolidBrush(hover ? HoverColor : NormalColor))
                e.Graphics.FillPath(b, path);
            TextRenderer.DrawText(e.Graphics, Text, this.Font, r, this.ForeColor,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }

        private static System.Drawing.Drawing2D.GraphicsPath RoundedPath(Rectangle r, int radius)
        {
            var path = new System.Drawing.Drawing2D.GraphicsPath();
            int d = radius * 2;
            if (d <= 0) { path.AddRectangle(r); return path; }
            path.AddArc(r.X, r.Y, d, d, 180, 90);
            path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    // ============ 扁平自绘 Tab（白底无边框、去立体、圆角 pill）============
    public class FlatTabControl : TabControl
    {
        public Color NormalFill = Color.FromArgb(232, 235, 240);
        public Color HoverFill = Color.FromArgb(219, 224, 231);
        public Color ActiveFill = Color.FromArgb(50, 90, 250);
        public Color NormalFore = Color.FromArgb(90, 100, 118);
        public Color ActiveFore = Color.White;
        public int CornerRadius = 12;
        private int hoverIndex = -1;

        public FlatTabControl()
        {
            DrawMode = TabDrawMode.OwnerDrawFixed;
            SizeMode = TabSizeMode.Fixed;
            Alignment = TabAlignment.Top;
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            int idx = IndexAt(e.Location);
            if (idx != hoverIndex) { hoverIndex = idx; Invalidate(); }
            base.OnMouseMove(e);
        }
        protected override void OnMouseLeave(EventArgs e) { hoverIndex = -1; Invalidate(); base.OnMouseLeave(e); }

        private int IndexAt(Point p)
        {
            for (int i = 0; i < TabCount; i++) if (GetTabRect(i).Contains(p)) return i;
            return -1;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            // 整个 tab 条自绘：白底，无灰底/边框/立体
            e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            e.Graphics.Clear(Color.White);
            if (TabCount == 0) return;
            using (var bold = new Font(this.Font, FontStyle.Bold))
            {
                for (int i = 0; i < TabCount; i++)
                {
                    Rectangle r = GetTabRect(i);
                    r.Inflate(-6, -7);
                    if (r.Width < 1) r.Width = 1;
                    if (r.Height < 1) r.Height = 1;
                    bool active = (i == SelectedIndex);
                    bool hover = (i == hoverIndex);
                    Color fill = active ? ActiveFill : (hover ? HoverFill : NormalFill);
                    Color fore = active ? ActiveFore : NormalFore;
                    using (var path = RRectPath(r, CornerRadius))
                    using (var b = new SolidBrush(fill))
                        e.Graphics.FillPath(b, path);
                    TextRenderer.DrawText(e.Graphics, TabPages[i].Text, active ? bold : this.Font, r, fore,
                        TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);
                }
            }
        }

        private static System.Drawing.Drawing2D.GraphicsPath RRectPath(Rectangle r, int radius)
        {
            var path = new System.Drawing.Drawing2D.GraphicsPath();
            int d = radius * 2;
            if (d <= 0) { path.AddRectangle(r); return path; }
            path.AddArc(r.X, r.Y, d, d, 180, 90);
            path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    // ============ 主窗体 ============
    public class MainForm : Form
    {
        private Workbench[] benches;          // 由 config.json 构建
        private AppConfig appConfig;          // 当前加载的配置

        private TabControl mainTabs;          // 顶层分页（含设置）
        private TabControl wbTabs;            // DSH智能体管理 内的工作台子tab
        private Dictionary<string, CheckBox> oneClickChecks = new Dictionary<string, CheckBox>();  // 各工作台tab的"一键开关控制"
        private CheckBox npsCheck;              // NPS 页的"一键开关控制"（是否参与全部启动/全部停止）
        private Dictionary<string, CheckBox> overviewChecks = new Dictionary<string, CheckBox>();  // 总览里各工作台的"一键开关控制"
        private CheckBox npsOverviewCheck;      // 总览里 NPS 的"一键开关控制"
        private List<Label> overviewStatus = new List<Label>();   // 总览里各工作台状态标签
        private Dictionary<string, Label> cardStatus = new Dictionary<string, Label>();   // 各工作台子tab状态标签（按工作台名）
        private Label npsOverviewStatus;       // 总览里 NPS 状态标签
        private Label npsStatusLabel;          // NPS 页里状态标签
        private System.Windows.Forms.TextBox npsLog;
        private ToolStripStatusLabel statusLabel;
        private ToolStripStatusLabel monitorStatusLabel;   // 状态栏「实时监听/未实时监听」指示
        private NotifyIcon tray;
        private Icon trayIcon;
        private ContextMenuStrip trayMenu;
        private bool exiting;
        private System.Threading.EventWaitHandle showSignal;

        // ---- 设置页控件 ----
        private System.Windows.Forms.TextBox txtNodeExe, txtEngineHome, txtBinJs, txtWorkDir, txtDshHome, txtNpcDir;
        private Label lblCfgStatus;
        private System.Windows.Forms.TextBox txtDetectOut;
        private System.Windows.Forms.CheckBox chkRealtime;
        private Label lblRealtimeStatus;
        private System.Windows.Forms.Timer monitorTimer;

        public MainForm()
        {
            appConfig = Config.Load();
            Tool.InitFromConfig(appConfig);
            Nps.InitFromConfig(appConfig);
            benches = BuildBenches(appConfig);

            Text = "StartControllers  ·  启动控制器";
            ClientSize = new Size(1000, 780);
            MinimumSize = new Size(920, 700);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(245, 247, 250);

            mainTabs = new TabControl();
            mainTabs.Dock = DockStyle.Fill;
            StyleTabs(mainTabs, 46);
            Controls.Add(mainTabs);

            // 顶部留白，避免 tab 贴住标题栏（"偏上"时下移一点）
            Panel topPad = new Panel();
            topPad.Dock = DockStyle.Top;
            topPad.Height = 10;
            topPad.BackColor = Color.FromArgb(245, 247, 250);
            Controls.Add(topPad);

            StatusStrip ss = new StatusStrip();
            ss.SizingGrip = false;
            ss.Font = new Font("Microsoft YaHei", 10F);
            statusLabel = new ToolStripStatusLabel();
            statusLabel.Text = "版本 1.3   ·   StartControllers";
            ss.Items.Add(statusLabel);
            monitorStatusLabel = new ToolStripStatusLabel();
            monitorStatusLabel.Text = (appConfig.Ui != null && appConfig.Ui.RealtimeMonitor) ? "实时监听" : "未实时监听";
            monitorStatusLabel.ForeColor = (appConfig.Ui != null && appConfig.Ui.RealtimeMonitor) ? Color.FromArgb(40, 120, 60) : Color.FromArgb(120, 125, 135);
            ss.Items.Add(new ToolStripStatusLabel() { Text = "   " });   // 间隔
            ss.Items.Add(monitorStatusLabel);
            Controls.Add(ss);

            mainTabs.TabPages.Add(BuildOverviewTab());
            mainTabs.TabPages.Add(BuildAgentMgmtTab());
            mainTabs.TabPages.Add(BuildNpsTab());
            mainTabs.TabPages.Add(BuildSettingsTab());
            RecomputeTabSize(mainTabs, 46);

            WireCheckSync();   // 总览与各tab里的"一键开关控制"保持同步

            SetupTray();
            RefreshAllTabs();
            SetupShowListener();
        }

        // 单实例：新实例启动时，通过命名事件通知已有实例把窗口显示出来
        private void SetupShowListener()
        {
            try
            {
                showSignal = new System.Threading.EventWaitHandle(false, System.Threading.EventResetMode.AutoReset, "StartControllers_v1_ShowSignal");
                var t = new System.Threading.Thread(() =>
                {
                    while (true)
                    {
                        try { showSignal.WaitOne(); }
                        catch { return; }
                        try { BeginInvoke(new Action(ShowWindow)); }
                        catch { }
                    }
                }) { IsBackground = true };
                t.Start();
            }
            catch { }
        }

        // ---------- Tab 美化：顶部、自绘，选中高亮，等宽均分占满一行 ----------
        private void StyleTabs(TabControl tc, int tabHeight)
        {
            tc.Alignment = TabAlignment.Top;
            tc.DrawMode = TabDrawMode.OwnerDrawFixed;
            tc.SizeMode = TabSizeMode.Fixed;
            tc.BackColor = Color.White;
            tc.Padding = new Point(0, 0);
            tc.Font = new Font("Microsoft YaHei", 13F);
            tc.DrawItem += Tabs_DrawItem;
            tc.SizeChanged += (s, e) => RecomputeTabSize(tc, tabHeight);
            RecomputeTabSize(tc, tabHeight);
        }

        // 平均分布：把 tab 宽度设为"整行宽 / tab 数 - 缝隙"，让几个 tab 占满一行
        private bool recomputingTab;
        private void RecomputeTabSize(TabControl tc, int tabHeight)
        {
            if (tc.TabCount == 0 || recomputingTab) return;
            recomputingTab = true;
            try
            {
                int gap = 8;
                int w = Math.Max(90, (tc.Width - (tc.TabCount - 1) * gap) / tc.TabCount);
                if (tc.ItemSize.Width != w || tc.ItemSize.Height != tabHeight)
                    tc.ItemSize = new Size(w, tabHeight);
            }
            finally { recomputingTab = false; }
        }

        private void Tabs_DrawItem(object sender, DrawItemEventArgs e)
        {
            TabControl tc = (TabControl)sender;
            TabPage page = tc.TabPages[e.Index];
            Rectangle r = e.Bounds;
            r.Inflate(-6, -7);   // 每个 tab 四周留缝，避免贴着
            if (r.Width < 1) r.Width = 1;
            if (r.Height < 1) r.Height = 1;
            bool selected = e.Index == tc.SelectedIndex;
            Color bg = selected ? Color.FromArgb(50, 90, 250) : Color.FromArgb(232, 235, 240);
            Color fg = selected ? Color.White : Color.Black;   // 未选中文字用黑色，保证能看清
            e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            using (var path = RRectPath(r, 12))
            using (var b = new SolidBrush(bg))
                e.Graphics.FillPath(b, path);
            TextRenderer.DrawText(e.Graphics, page.Text, tc.Font, r, fg,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }

        private static System.Drawing.Drawing2D.GraphicsPath RRectPath(Rectangle r, int radius)
        {
            var path = new System.Drawing.Drawing2D.GraphicsPath();
            int d = radius * 2;
            if (d <= 0) { path.AddRectangle(r); return path; }
            path.AddArc(r.X, r.Y, d, d, 180, 90);
            path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        // 水平分隔线
        private Panel MakeSep(int x, int y, int width)
        {
            Panel p = new Panel();
            p.BackColor = Color.FromArgb(226, 229, 235);
            p.Location = new Point(x, y);
            p.Width = width;
            p.Height = 1;
            return p;
        }

        // 圆角按钮：primary=蓝底白字，else=浅灰底深字
        private RoundedButton NiceButton(string text, int x, int y, int w, int h, bool primary)
        {
            RoundedButton b = new RoundedButton();
            b.Text = text; b.Location = new Point(x, y); b.Width = w; b.Height = h;
            b.Font = new Font("Microsoft YaHei", 12F);
            if (primary) { b.NormalColor = Color.FromArgb(50, 90, 250); b.HoverColor = Color.FromArgb(70, 110, 255); b.ForeColor = Color.White; }
            else { b.NormalColor = Color.FromArgb(240, 242, 246); b.HoverColor = Color.FromArgb(221, 226, 233); b.ForeColor = Color.FromArgb(58, 68, 88); }
            return b;
        }

        // 从配置构建工作台数组
        private Workbench[] BuildBenches(AppConfig cfg)
        {
            var list = new List<Workbench>();
            if (cfg != null && cfg.Workbenches != null)
            {
                foreach (var w in cfg.Workbenches)
                {
                    if (!w.Enabled) continue;
                    if (string.IsNullOrEmpty(w.Profile)) continue;
                    string args = Tool.BuildArgs(w.Args, w);
                    string url = "http://127.0.0.1:" + w.Port;
                    Workbench wb = new Workbench(w.Name, w.Profile, w.Port, url, w.Desc, args);
                    wb.Participate = w.Participate ?? true;
                    list.Add(wb);
                }
            }
            return list.ToArray();
        }

        // 增删工作台后：重建工作台相关 tab（整组重建，避免 RemoveAt 索引问题）
        private void ReloadWorkbenchTabs()
        {
            benches = BuildBenches(appConfig);
            overviewStatus.Clear(); overviewChecks.Clear(); cardStatus.Clear(); oneClickChecks.Clear();
            string sel = mainTabs.SelectedTab != null ? mainTabs.SelectedTab.Text : "";
            mainTabs.TabPages.Clear();
            mainTabs.TabPages.Add(BuildOverviewTab());
            mainTabs.TabPages.Add(BuildAgentMgmtTab());
            mainTabs.TabPages.Add(BuildNpsTab());
            mainTabs.TabPages.Add(BuildSettingsTab());
            WireCheckSync();
            RecomputeTabSize(mainTabs, 46);
            foreach (TabPage t in mainTabs.TabPages) if (t.Text == sel) { mainTabs.SelectedTab = t; break; }
            RefreshAllTabs();
        }

        // ---------- 分页：设置（内部再分「运行环境」/「其它设置」两个子 tab）----------
        private TabPage BuildSettingsTab()
        {
            TabPage page = new TabPage("设置");
            page.Padding = new Padding(0);
            page.BackColor = Color.White;

            TabControl inner = new TabControl();
            inner.Dock = DockStyle.Fill;
            StyleTabs(inner, 42);
            inner.TabPages.Add(BuildSettingsPathPage());
            inner.TabPages.Add(BuildOtherSettingsPage());
            RecomputeTabSize(inner, 42);
            page.Controls.Add(inner);
            return page;
        }

        // 子 tab 1：运行环境路径（原设置页内容，保持不变）
        private TabPage BuildSettingsPathPage()
        {
            TabPage page = new TabPage("运行环境");
            page.Padding = new Padding(24);
            page.BackColor = Color.White;

            Label title = new Label();
            title.Text = "设置 · 运行环境路径"; title.AutoSize = true;
            title.Font = new Font("Microsoft YaHei", 22F, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(30, 40, 70);
            title.Location = new Point(28, 20);
            page.Controls.Add(title);

            Label hint = new Label();
            hint.Text = "路径保存在软件同目录 config.json。留空用内置默认；点「保存配置」后需重启程序生效。";
            hint.AutoSize = true;
            hint.Font = new Font("Microsoft YaHei", 11F);
            hint.ForeColor = Color.FromArgb(120, 125, 135);
            hint.Location = new Point(28, 64);
            page.Controls.Add(hint);

            int lx = 28, tx = 170, y = 124, lh = 34;

            lblCfgStatus = new Label();
            lblCfgStatus.AutoSize = true;
            lblCfgStatus.Font = new Font("Microsoft YaHei", 11F);
            lblCfgStatus.ForeColor = Color.FromArgb(70, 90, 120);
            lblCfgStatus.Location = new Point(lx, 94);
            lblCfgStatus.Text = "配置已加载（config.json）";
            page.Controls.Add(lblCfgStatus);

            txtNodeExe = AddPathRow(page, "node.exe", lx, tx, y, lh); y += lh + 8;
            txtEngineHome = AddPathRow(page, "DSH 引擎目录", lx, tx, y, lh); y += lh + 8;
            txtBinJs = AddPathRow(page, "bin.js", lx, tx, y, lh); y += lh + 8;
            txtWorkDir = AddPathRow(page, "工作目录", lx, tx, y, lh); y += lh + 8;
            txtDshHome = AddPathRow(page, "DSH 数据目录", lx, tx, y, lh); y += lh + 8;
            txtNpcDir = AddPathRow(page, "NPS npc 目录", lx, tx, y, lh); y += lh + 8;

            y += 16;   // 与路径行留些间距

            RoundedButton btnDetect = NiceButton("自动检测环境", lx, y, 150, 42, true);
            btnDetect.Click += (s, e) => DoDetect(); page.Controls.Add(btnDetect);
            RoundedButton btnSave = NiceButton("保存配置", lx + 160, y, 120, 42, true);
            btnSave.Click += (s, e) => DoSaveConfig(); page.Controls.Add(btnSave);
            RoundedButton btnOpen = NiceButton("打开 config.json", lx + 290, y, 150, 42, false);
            btnOpen.Click += (s, e) => OpenConfig(); page.Controls.Add(btnOpen);
            y += 56;

            txtDetectOut = new System.Windows.Forms.TextBox();
            txtDetectOut.Multiline = true; txtDetectOut.ReadOnly = true;
            txtDetectOut.ScrollBars = ScrollBars.Vertical;
            txtDetectOut.Font = new Font("Microsoft YaHei", 12F);
            txtDetectOut.BackColor = Color.FromArgb(248, 249, 252);
            txtDetectOut.Location = new Point(lx, y);
            txtDetectOut.Size = new Size(page.Width - 56 > 0 ? page.Width - 56 : 640, 250);
            txtDetectOut.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Bottom;
            txtDetectOut.Text = "-- 操作日志 / 检测结果 --\r\n";
            page.Controls.Add(txtDetectOut);

            FillSettingsFromConfig();
            return page;
        }

        // 子 tab 2：其它设置（实时监测）
        private TabPage BuildOtherSettingsPage()
        {
            TabPage page = new TabPage("其它设置");
            page.Padding = new Padding(24);
            page.BackColor = Color.White;

            Label title = new Label();
            title.Text = "其它设置"; title.AutoSize = true;
            title.Font = new Font("Microsoft YaHei", 22F, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(30, 40, 70);
            title.Location = new Point(28, 20);
            page.Controls.Add(title);

            Label hint = new Label();
            hint.Text = "「实时监测」勾选后，会定时检查各工作台/NPS 的端口状态并刷新界面，以便感知在外部被开启/关闭的情况；不勾则不监听。";
            hint.AutoSize = true;
            hint.Font = new Font("Microsoft YaHei", 11F);
            hint.ForeColor = Color.FromArgb(120, 125, 135);
            hint.Location = new Point(28, 62);
            page.Controls.Add(hint);

            chkRealtime = new CheckBox();
            chkRealtime.Text = "实时监测（自动感知实例开启/关闭）";
            chkRealtime.AutoSize = true;
            chkRealtime.Font = new Font("Microsoft YaHei", 13F);
            chkRealtime.ForeColor = Color.FromArgb(40, 50, 75);
            chkRealtime.Location = new Point(28, 104);
            chkRealtime.Checked = appConfig.Ui != null && appConfig.Ui.RealtimeMonitor;
            chkRealtime.CheckedChanged += (s, e) => SetMonitor(chkRealtime.Checked);
            page.Controls.Add(chkRealtime);

            lblRealtimeStatus = new Label();
            lblRealtimeStatus.AutoSize = true;
            lblRealtimeStatus.Font = new Font("Microsoft YaHei", 11F);
            lblRealtimeStatus.ForeColor = Color.FromArgb(70, 90, 120);
            lblRealtimeStatus.Location = new Point(28, 140);
            lblRealtimeStatus.Text = "";
            page.Controls.Add(lblRealtimeStatus);

            SetMonitor(chkRealtime.Checked);   // 按初始勾选状态决定是否启动监听
            return page;
        }

        // 开启/关闭实时监测
        private void SetMonitor(bool on)
        {
            try
            {
                if (on)
                {
                    if (monitorTimer == null)
                    {
                        monitorTimer = new System.Windows.Forms.Timer();
                        monitorTimer.Interval = 3000;
                        monitorTimer.Tick += (s, e) => { try { RefreshAllTabs(); } catch { } };
                    }
                    monitorTimer.Start();
                    if (lblRealtimeStatus != null) lblRealtimeStatus.Text = "实时监测已开启（每 3 秒刷新一次状态）";
                    if (monitorStatusLabel != null) { monitorStatusLabel.Text = "实时监听"; monitorStatusLabel.ForeColor = Color.FromArgb(40, 120, 60); }
                }
                else
                {
                    if (monitorTimer != null) monitorTimer.Stop();
                    if (lblRealtimeStatus != null) lblRealtimeStatus.Text = "实时监测已关闭";
                    if (monitorStatusLabel != null) { monitorStatusLabel.Text = "未实时监听"; monitorStatusLabel.ForeColor = Color.FromArgb(120, 125, 135); }
                }
            }
            catch { }
        }

        private System.Windows.Forms.TextBox AddPathRow(TabPage page, string labelText, int lx, int tx, int y, int lh)
        {
            Label lab = new Label();
            lab.Text = labelText; lab.AutoSize = true;
            lab.Font = new Font("Microsoft YaHei", 12F);
            lab.ForeColor = Color.FromArgb(60, 72, 96);
            lab.Location = new Point(lx, y);
            page.Controls.Add(lab);

            System.Windows.Forms.TextBox tb = new System.Windows.Forms.TextBox();
            tb.Font = new Font("Microsoft YaHei", 11F);
            tb.Width = 620;
            tb.Top = y - 2;
            tb.Left = tx;
            tb.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            page.Controls.Add(tb);
            return tb;
        }

        private void FillSettingsFromConfig()
        {
            if (appConfig == null || appConfig.Paths == null) return;
            txtNodeExe.Text = appConfig.Paths.NodeExe ?? "";
            txtEngineHome.Text = appConfig.Paths.EngineHome ?? "";
            txtBinJs.Text = appConfig.Paths.BinJs ?? "";
            txtWorkDir.Text = appConfig.Paths.WorkDir ?? "";
            txtDshHome.Text = appConfig.Paths.DshHome ?? "";
            txtNpcDir.Text = appConfig.Paths.NpcDir ?? "";
        }

        private void DoDetect()
        {
            var sb = new StringBuilder();
            sb.AppendLine("-- 环境检测 / 一键填写 --");

            // 1) node.exe
            string node = Tool.DetectNodeExe();
            if (!string.IsNullOrEmpty(node)) { txtNodeExe.Text = node; sb.AppendLine("node.exe -> " + node); }
            else sb.AppendLine("node.exe -> 未找到");

            // 2) DSH 数据目录（DSH_HOME 环境变量）
            string dsh = Tool.DetectDshHome();
            txtDshHome.Text = dsh;
            sb.AppendLine("DSH_HOME -> " + dsh);

            // 3) bin.js + DSH 引擎目录：优先当前输入框，空则取「已加载配置」，再反推引擎根目录
            const string binTail = @"\node_modules\@deepseek-ai\dsh\lib\bin.js";
            string bin = txtBinJs.Text.Trim();
            if (string.IsNullOrEmpty(bin) && appConfig != null && appConfig.Paths != null) bin = appConfig.Paths.BinJs ?? "";
            if (!string.IsNullOrEmpty(bin)) { txtBinJs.Text = bin; }
            string eng = "";
            if (!string.IsNullOrEmpty(bin) && bin.EndsWith(binTail, StringComparison.OrdinalIgnoreCase))
                eng = bin.Substring(0, bin.Length - binTail.Length);
            if (!string.IsNullOrEmpty(eng)) { txtEngineHome.Text = eng; sb.AppendLine("DSH 引擎目录 -> " + eng); }

            // 4) 工作目录：优先输入框，空则取已加载配置，再空则用引擎目录上一级
            string wd = txtWorkDir.Text.Trim();
            if (string.IsNullOrEmpty(wd) && appConfig != null && appConfig.Paths != null) wd = appConfig.Paths.WorkDir ?? "";
            if (string.IsNullOrEmpty(wd) && !string.IsNullOrEmpty(eng))
            {
                try { var parent = Directory.GetParent(eng); if (parent != null) wd = parent.FullName; } catch { }
            }
            if (!string.IsNullOrEmpty(wd)) txtWorkDir.Text = wd;

            // 4b) npc 目录：优先输入框，空则取已加载配置（无法自动定位，只能回填配置值）
            string npc = txtNpcDir.Text.Trim();
            if (string.IsNullOrEmpty(npc) && appConfig != null && appConfig.Paths != null) npc = appConfig.Paths.NpcDir ?? "";
            if (!string.IsNullOrEmpty(npc)) txtNpcDir.Text = npc;

            // 5) profiles
            string[] profs = Tool.DetectProfiles(dsh);
            string root = dsh == "" ? "" : Path.Combine(dsh, "profiles");
            sb.AppendLine("profiles（来自 " + root + "）: " + profs.Length + (profs.Length > 0 ? "  (" + string.Join(", ", profs) + ")" : ""));

            sb.AppendLine("已按「检测结果 + 已加载配置」填写全部输入框");
            txtDetectOut.Text = sb.ToString() + txtDetectOut.Text;
            lblCfgStatus.Text = "已一键填写全部路径（未保存）";
        }

        private WbCfg FindWbCfg(Workbench b)
        {
            if (appConfig == null || appConfig.Workbenches == null) return null;
            foreach (var w in appConfig.Workbenches)
                if (w.Profile == b.Profile && w.Port == b.Port) return w;
            return null;
        }

        // 勾选「一键开关控制」改变时，自动写回 config（无需手动点保存配置）
        private void PersistWorkbenchParticipate(Workbench b, bool val)
        {
            try
            {
                var w = FindWbCfg(b);
                if (w != null) w.Participate = val;
                Config.Save(appConfig);
            }
            catch { }
        }
        private void PersistNpsParticipate(bool val)
        {
            try
            {
                if (appConfig.Nps != null) appConfig.Nps.Participate = val;
                Config.Save(appConfig);
            }
            catch { }
        }

        private void DoSaveConfig()
        {
            // bin.js 为空时，若填了引擎目录，则自动派生兜底
            string engineHome = txtEngineHome.Text.Trim();
            string binJs = txtBinJs.Text.Trim();
            if (string.IsNullOrEmpty(binJs) && !string.IsNullOrEmpty(engineHome))
                binJs = Path.Combine(engineHome, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");

            var cfg = new AppConfig();
            cfg.Paths = new PathCfg()
            {
                NodeExe = txtNodeExe.Text.Trim(),
                EngineHome = engineHome,
                BinJs = binJs,
                WorkDir = txtWorkDir.Text.Trim(),
                DshHome = txtDshHome.Text.Trim(),
                NpcDir = txtNpcDir.Text.Trim()
            };
            // 持久化「一键开关控制」勾选状态（写回 config，重开恢复到上次状态）
            foreach (var b in benches)
            {
                CheckBox c;
                if (oneClickChecks.TryGetValue(b.Name, out c))
                {
                    var w = FindWbCfg(b);
                    if (w != null) w.Participate = c.Checked;
                }
            }
            bool npsPart = npsCheck != null && npsCheck.Checked;

            cfg.Workbenches = appConfig.Workbenches;   // 工作台列表不在此页编辑
            cfg.Nps = new NpsCfg() { Enabled = (appConfig != null && appConfig.Nps != null) ? appConfig.Nps.Enabled : true, Participate = npsPart };
            cfg.Ui = new UiCfg() { RealtimeMonitor = chkRealtime != null && chkRealtime.Checked };
            try
            {
                Config.Save(cfg);
                appConfig = cfg;
                Tool.InitFromConfig(cfg);
                Nps.InitFromConfig(cfg);
                lblCfgStatus.Text = "已保存 config.json；重启程序后生效";
                txtDetectOut.Text = "-- 配置已保存到 " + Config.ConfigFile + " --\r\n" + txtDetectOut.Text;
            }
            catch (Exception ex) { lblCfgStatus.Text = "保存失败：" + ex.Message; }
        }

        private void OpenConfig()
        {
            try
            {
                if (!File.Exists(Config.ConfigFile)) File.WriteAllText(Config.ConfigFile, Config.ExampleTemplate(), Encoding.UTF8);
                Process.Start(Config.ConfigFile);
            }
            catch (Exception ex) { lblCfgStatus.Text = "打开失败：" + ex.Message; }
        }

        // ---------- 分页 1：运行状态总览 ----------
        private TabPage BuildOverviewTab()
        {
            TabPage page = new TabPage("运行状态总览");
            page.Padding = new Padding(24);
            page.BackColor = Color.White;

            Label title = new Label();
            title.Text = "运行状态总览"; title.AutoSize = true;
            title.Font = new Font("Microsoft YaHei", 24F, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(30, 40, 70);
            title.Location = new Point(28, 20);
            page.Controls.Add(title);

            // 一键控制：工作台(按勾选) + NPS 外网访问 一起开关（同托盘语义）
            RoundedButton ovStart = NiceButton("启动已勾选", 700, 20, 112, 44, true);
            ovStart.Click += (s, e) => AllStart(true);
            page.Controls.Add(ovStart);

            RoundedButton ovStop = NiceButton("关闭已勾选", 822, 20, 112, 44, false);
            ovStop.Click += (s, e) => AllStop(true);
            page.Controls.Add(ovStop);

            page.Controls.Add(MakeSep(28, 78, 906));

            // 每行结构：内容区(标题+状态+按钮) → 20px → 分隔线 → 20px → 下一行（上下边距统一20px）
            int rowY = 100, rowH = 149;
            for (int i = 0; i < benches.Length; i++)
            {
                Workbench b = benches[i];

                // 每个工作台选项左侧：一键开关控制（只保留小勾，与对应tab页的勾选同步）
                CheckBox chk = new CheckBox();
                chk.Text = "";
                chk.Checked = b.Participate;   // 读取持久化状态
                chk.AutoSize = true;
                chk.Font = new Font("Microsoft YaHei", 17F);   // 加大勾选框（原生控件大小受限）
                chk.ForeColor = Color.FromArgb(58, 68, 88);
                chk.Location = new Point(28, rowY + 4);
                chk.CheckedChanged += (s, e) => PersistWorkbenchParticipate(b, chk.Checked);   // 改变即自动保存
                page.Controls.Add(chk);
                overviewChecks[b.Name] = chk;

                Label name = new Label();
                name.Text = b.Name + "   (" + b.Port + " · " + b.Profile + ")";
                name.AutoSize = true;
                name.Font = new Font("Microsoft YaHei", 16F, FontStyle.Bold);
                name.ForeColor = Color.FromArgb(40, 50, 75);
                name.Location = new Point(62, rowY);
                page.Controls.Add(name);

                Label st = new Label();
                st.AutoSize = true;
                st.Font = new Font("Microsoft YaHei", 15F);   // 小字体放大
                st.ForeColor = Color.FromArgb(70, 90, 120);
                st.Location = new Point(28, rowY + 38);
                page.Controls.Add(st);
                overviewStatus.Add(st);

                // 开启 / 关闭（从对应tab页搬到总览）+ 打开网页 / 重启 / 复制链接
                RoundedButton btnStart = NiceButton("开启", 28, rowY + 68, 94, 40, true);
                btnStart.Click += (s, e) => DoAction(b, "start");
                page.Controls.Add(btnStart);

                RoundedButton btnStop = NiceButton("关闭", 132, rowY + 68, 94, 40, false);
                btnStop.Click += (s, e) => DoAction(b, "stop");
                page.Controls.Add(btnStop);

                RoundedButton open = NiceButton("打开网页", 236, rowY + 68, 94, 40, false);
                open.Click += (s, e) => DoAction(b, "open");
                page.Controls.Add(open);

                RoundedButton restart = NiceButton("重启", 340, rowY + 68, 94, 40, false);
                restart.Click += (s, e) => DoAction(b, "restart");
                page.Controls.Add(restart);

                RoundedButton copy = NiceButton("复制链接", 444, rowY + 68, 94, 40, false);
                string copyUrl = b.Url;
                copy.Click += (s, e) => CopyLink(b, copyUrl);
                page.Controls.Add(copy);

                page.Controls.Add(MakeSep(28, rowY + 128, 906));   // 分隔线：距按钮底20px

                rowY += rowH;
            }

            // NPS 外网访问（同样带一键开关控制 + 开启/关闭/状态 + 分隔线）
            int ny = rowY;
            CheckBox npsChk = new CheckBox();
            npsChk.Text = "";
            npsChk.Checked = appConfig.Nps != null && (appConfig.Nps.Participate ?? true);
            npsChk.AutoSize = true;
            npsChk.Font = new Font("Microsoft YaHei", 17F);   // 加大勾选框（原生控件大小受限）
            npsChk.ForeColor = Color.FromArgb(58, 68, 88);
            npsChk.Location = new Point(28, ny + 4);
            npsChk.CheckedChanged += (s, e) => PersistNpsParticipate(npsChk.Checked);   // 改变即自动保存
            page.Controls.Add(npsChk);
            npsOverviewCheck = npsChk;

            Label npsName = new Label();
            npsName.Text = "NPS 外网访问   (nps 内网穿透)";
            npsName.AutoSize = true;
            npsName.Font = new Font("Microsoft YaHei", 16F, FontStyle.Bold);
            npsName.ForeColor = Color.FromArgb(40, 50, 75);
            npsName.Location = new Point(62, ny);
            page.Controls.Add(npsName);

            npsOverviewStatus = new Label();
            npsOverviewStatus.AutoSize = true;
            npsOverviewStatus.Font = new Font("Microsoft YaHei", 15F);   // 小字体放大
            npsOverviewStatus.ForeColor = Color.FromArgb(70, 90, 120);
            npsOverviewStatus.Location = new Point(28, ny + 38);
            page.Controls.Add(npsOverviewStatus);

            RoundedButton npsStart = NiceButton("开启外网", 28, ny + 68, 118, 40, true);
            npsStart.Click += (s, e) => NpsAction("start");
            page.Controls.Add(npsStart);

            RoundedButton npsStop = NiceButton("关闭外网", 156, ny + 68, 118, 40, false);
            npsStop.Click += (s, e) => NpsAction("stop");
            page.Controls.Add(npsStop);

            RoundedButton npsStat = NiceButton("状态", 284, ny + 68, 80, 40, false);
            npsStat.Click += (s, e) => NpsAction("status");
            page.Controls.Add(npsStat);

            page.Controls.Add(MakeSep(28, ny + 128, 906));   // 分隔线：距按钮底20px

            return page;
        }

        // ---------- 分页 2：DSH智能体管理（内含工作台子tab）----------
        private TabPage BuildAgentMgmtTab()
        {
            TabPage page = new TabPage("DSH智能体管理");
            page.Padding = new Padding(0);
            page.BackColor = Color.White;

            wbTabs = new TabControl();
            wbTabs.Dock = DockStyle.Fill;
            StyleTabs(wbTabs, 44);
            foreach (Workbench b in benches) wbTabs.TabPages.Add(BuildWorkbenchTab(b));
            RecomputeTabSize(wbTabs, 44);
            page.Controls.Add(wbTabs);   // Fill，先加（占满余下空间）

            // 外层最下方：全部启动 + 全部停止
            Panel bottomBar = new Panel();
            bottomBar.Dock = DockStyle.Bottom;
            bottomBar.Height = 62;
            bottomBar.BackColor = Color.FromArgb(249, 250, 252);

            RoundedButton btnAdd = NiceButton("新增工作台", 28, 11, 120, 42, true);
            btnAdd.Click += (s, e) => AddWorkbench();
            bottomBar.Controls.Add(btnAdd);

            RoundedButton btnImport = NiceButton("从profiles导入", 156, 11, 140, 42, false);
            btnImport.Click += (s, e) => ImportProfiles();
            bottomBar.Controls.Add(btnImport);

            RoundedButton btnDel = NiceButton("删除当前", 304, 11, 100, 42, false);
            btnDel.Click += (s, e) => DeleteCurrentWorkbench();
            bottomBar.Controls.Add(btnDel);

            RoundedButton allStart = NiceButton("全部启动", 660, 11, 120, 42, true);
            allStart.Click += (s, e) => AllStart(false);
            bottomBar.Controls.Add(allStart);

            RoundedButton allStop = NiceButton("全部停止", 792, 11, 120, 42, false);
            allStop.Click += (s, e) => AllStop(false);
            bottomBar.Controls.Add(allStop);

            page.Controls.Add(bottomBar);   // Bottom，后加（落在最下方）
            return page;
        }

        // ---- 工作台管理 ----
        private void AddWorkbench()
        {
            using (var dlg = new AddWorkbenchDialog(DefaultPort()))
            {
                if (dlg.ShowDialog(this) == DialogResult.OK)
                {
                    var w = new WbCfg();
                    w.Name = dlg.WbName; w.Profile = dlg.WbProfile; w.Port = dlg.WbPort;
                    w.Desc = dlg.WbDesc; w.Args = "{binJs} --profile {profile} --port {port} --no-open"; w.Enabled = true;
                    if (appConfig.Workbenches == null) appConfig.Workbenches = new List<WbCfg>();
                    appConfig.Workbenches.Add(w);
                    Config.Save(appConfig);
                    ReloadWorkbenchTabs();
                    Tool.Log("已新增工作台：" + w.Name + "（" + w.Profile + " · " + w.Port + "）");
                }
            }
        }

        private void DeleteCurrentWorkbench()
        {
            if (wbTabs == null || wbTabs.SelectedIndex < 0) { Tool.Log("请先选中要删除的工作台子 tab"); return; }
            TabPage page = wbTabs.TabPages[wbTabs.SelectedIndex];
            string name = page.Text;
            var target = appConfig.Workbenches.Find(w => w.Name == name);
            if (target != null)
            {
                appConfig.Workbenches.Remove(target);
                Config.Save(appConfig);
                Tool.Log("已删除工作台：" + name);
                ReloadWorkbenchTabs();
            }
        }

        private void ImportProfiles()
        {
            string[] profs = Tool.DetectProfiles(appConfig.Paths != null ? appConfig.Paths.DshHome : Tool.DshHome);
            int added = 0;
            foreach (var p in profs)
            {
                bool exists = appConfig.Workbenches.Exists(zz => zz.Profile == p);
                if (exists) continue;
                var wb = new WbCfg();
                wb.Name = "工作台 · " + p; wb.Profile = p; wb.Port = NextPort();
                wb.Desc = "（从 profiles 导入）"; wb.Args = "{binJs} --profile {profile} --port {port} --no-open"; wb.Enabled = true;
                appConfig.Workbenches.Add(wb);
                added++;
            }
            if (added > 0)
            {
                Config.Save(appConfig);
                ReloadWorkbenchTabs();
                Tool.Log("已从 profiles 导入 " + added + " 个工作台");
            }
            else Tool.Log("没有需要导入的新 profile（均已存在）");
        }

        private string DefaultPort() { return NextPort(); }
        private string NextPort()
        {
            int max = 49981;
            foreach (var w in appConfig.Workbenches)
            { int p; if (int.TryParse(w.Port, out p) && p > max) max = p; }
            return (max + 1).ToString();
        }

        // ---------- 分页 3：NPS端口管理 ----------
        private TabPage BuildNpsTab()
        {
            TabPage page = new TabPage("NPS端口管理");
            page.Padding = new Padding(24);
            page.BackColor = Color.White;

            Label title = new Label();
            title.Text = "NPS 外网访问"; title.AutoSize = true;
            title.Font = new Font("Microsoft YaHei", 24F, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(30, 40, 70);
            title.Location = new Point(28, 20);
            page.Controls.Add(title);

            npsStatusLabel = new Label();
            npsStatusLabel.AutoSize = true;
            npsStatusLabel.Font = new Font("Microsoft YaHei", 16F);
            npsStatusLabel.ForeColor = Color.FromArgb(70, 90, 120);
            npsStatusLabel.Location = new Point(28, 84);
            page.Controls.Add(npsStatusLabel);

            // 一键开关控制：放在状态行最右边（是否参与「全部启动/全部停止」）
            npsCheck = new CheckBox();
            npsCheck.Text = "一键开关控制";
            npsCheck.Checked = appConfig.Nps != null && (appConfig.Nps.Participate ?? true);
            npsCheck.AutoSize = true;
            npsCheck.Font = new Font("Microsoft YaHei", 12F);
            npsCheck.ForeColor = Color.FromArgb(58, 68, 88);
            npsCheck.Location = new Point(770, 82);
            npsCheck.CheckedChanged += (s, e) => PersistNpsParticipate(npsCheck.Checked);   // 改变即自动保存
            page.Controls.Add(npsCheck);

            Label desc = new Label();
            desc.Text = "启动本地 npc 客户端，把本机服务穿透到公网（nps 服务器 " + Nps.ConfigSummary() + "）。";
            desc.AutoSize = true;
            desc.Font = new Font("Microsoft YaHei", 12F);
            desc.ForeColor = Color.FromArgb(120, 125, 135);
            desc.Location = new Point(28, 124);
            page.Controls.Add(desc);

            page.Controls.Add(MakeSep(28, 160, page.Width - 56));

            Button startBtn = MakeNpsBtn("开启外网", 28, 180, "start");
            Button stopBtn = MakeNpsBtn("关闭外网", 158, 180, "stop");
            Button statBtn = MakeNpsBtn("状态", 288, 180, "status");
            page.Controls.Add(startBtn); page.Controls.Add(stopBtn); page.Controls.Add(statBtn);

            npsLog = new System.Windows.Forms.TextBox();
            npsLog.Multiline = true; npsLog.ReadOnly = true;
            npsLog.ScrollBars = ScrollBars.Vertical;
            npsLog.Font = new Font("Microsoft YaHei", 14F);
            npsLog.BackColor = Color.FromArgb(248, 249, 252);
            npsLog.Location = new Point(28, 250);
            npsLog.Size = new Size(page.Width - 56, 320);
            npsLog.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Bottom;
            npsLog.Text = "-- NPS 操作日志（开启/关闭/状态）--\r\n";
            page.Controls.Add(npsLog);

            return page;
        }

        private RoundedButton MakeNpsBtn(string text, int x, int y, string action)
        {
            bool primary = action == "start";
            RoundedButton b = NiceButton(text, x, y, 118, 48, primary);
            b.Click += delegate { NpsAction(action); };
            return b;
        }

        private void NpsAction(string action)
        {
            if (action == "start" || action == "stop")
            {
                Task.Run(() =>
                {
                    bool ok = action == "start" ? Nps.Start() : Nps.Stop();
                    string result = ok ? (action == "start" ? "已开启" : "已关闭") : (action == "start" ? "启动失败" : "关闭失败");
                    string m = "[ " + DateTime.Now.ToString("HH:mm:ss") + " ] 外网访问 " + result + "\r\n";
                    try { BeginInvoke(new Action(() => { AppendNpsLog(m); RefreshAllTabs(); })); } catch { }
                });
                return;
            }
            string sm = "[ " + DateTime.Now.ToString("HH:mm:ss") + " ] 状态  " + (Nps.IsRunning() ? "运行中" : "已停止") + "\r\n";
            AppendNpsLog(sm);
        }

        private void AppendNpsLog(string text) { if (npsLog != null) { npsLog.Text = text + npsLog.Text; npsLog.SelectionStart = 0; npsLog.ScrollToCaret(); } }

        // ---------- 工作台分页（子tab）----------
        private TabPage BuildWorkbenchTab(Workbench b)
        {
            TabPage page = new TabPage(b.Name);
            page.Padding = new Padding(0);
            page.BackColor = Color.White;

            // 日志：Dock=Fill（固定为"中间的填充区"，先添加）
            TextBox log = new TextBox();
            log.Name = "cardLog"; log.Multiline = true; log.ReadOnly = true;
            log.ScrollBars = ScrollBars.Vertical;
            log.Font = new Font("Microsoft YaHei", 14F);
            log.BackColor = Color.FromArgb(250, 251, 253);
            log.BorderStyle = BorderStyle.FixedSingle;
            log.Dock = DockStyle.Fill;
            log.Text = "-- 操作日志（开启/关闭/状态）--\r\n";
            page.Controls.Add(log);

            // 顶部内容：Dock=Top
            Panel top = new Panel();
            top.Dock = DockStyle.Top;
            top.Height = 292;
            top.BackColor = Color.White;

            Label name = new Label();
            name.Text = b.Name; name.AutoSize = true;
            name.Font = new Font("Microsoft YaHei", 22F, FontStyle.Bold);
            name.ForeColor = Color.FromArgb(28, 38, 62);
            name.Location = new Point(26, 16);
            top.Controls.Add(name);

            Label status = new Label();
            status.Name = "cardStatus"; status.AutoSize = true;
            status.Font = new Font("Microsoft YaHei", 15F);
            status.ForeColor = Color.FromArgb(60, 72, 96);
            status.Location = new Point(26, 68);
            status.Text = "状态：" + b.StateLabel();
            top.Controls.Add(status);
            cardStatus[b.Name] = status;

            // 一键开关控制：放在状态行最右边（靠右）
            CheckBox chk = new CheckBox();
            chk.Text = "一键开关控制";
            chk.Checked = b.Participate;   // 读取持久化状态
            chk.AutoSize = true;
            chk.Font = new Font("Microsoft YaHei", 12F);
            chk.ForeColor = Color.FromArgb(58, 68, 88);
            chk.Location = new Point(760, 64);
            chk.CheckedChanged += (s, e) => PersistWorkbenchParticipate(b, chk.Checked);   // 改变即自动保存
            top.Controls.Add(chk);
            oneClickChecks[b.Name] = chk;

            top.Controls.Add(MakeSep(26, 104, 720));

            Label desc = new Label();
            desc.Text = b.Desc + "   ·   profile = " + b.Profile + "   ·   端口 = " + b.Port;
            desc.AutoSize = true;
            desc.Font = new Font("Microsoft YaHei", 13F);
            desc.ForeColor = Color.FromArgb(118, 124, 134);
            desc.Location = new Point(26, 120);
            top.Controls.Add(desc);

            Label url = new Label();
            url.Text = "地址：" + b.Url; url.AutoSize = true;
            url.Font = new Font("Microsoft YaHei", 12F);
            url.ForeColor = Color.FromArgb(118, 124, 134);
            url.Location = new Point(26, 152);
            top.Controls.Add(url);

            Label target = new Label();
            target.Name = "cardTarget"; target.AutoSize = true;
            target.Text = "启动命令：node " + b.Args;
            target.Font = new Font("Microsoft YaHei", 11F);
            target.ForeColor = Color.FromArgb(110, 120, 145);
            target.Location = new Point(26, 188);
            top.Controls.Add(target);

            top.Controls.Add(MakeSep(26, 224, 720));

            RoundedButton startBtn = NiceButton("开启", 26, 240, 128, 44, true);
            startBtn.Click += (s, e) => DoAction(b, "start");
            RoundedButton stopBtn = NiceButton("关闭", 162, 240, 128, 44, false);
            stopBtn.Click += (s, e) => DoAction(b, "stop");
            RoundedButton statBtn = NiceButton("状态", 298, 240, 128, 44, false);
            statBtn.Click += (s, e) => DoAction(b, "status");
            RoundedButton openBtn = NiceButton("打开网页", 434, 240, 128, 44, false);
            openBtn.Click += (s, e) => DoAction(b, "open");
            RoundedButton restartBtn = NiceButton("重启", 570, 240, 128, 44, false);
            restartBtn.Click += (s, e) => DoAction(b, "restart");
            top.Controls.Add(startBtn); top.Controls.Add(stopBtn);
            top.Controls.Add(statBtn); top.Controls.Add(openBtn);
            top.Controls.Add(restartBtn);

            page.Controls.Add(top);

            return page;
        }

        private Button MakeBtn(string text, int x, int y, Workbench b, string action)
        {
            Button btn = new Button();
            btn.Text = text; btn.Width = 120; btn.Height = 48;
            btn.Location = new Point(x, y);
            btn.Font = new Font("Microsoft YaHei", 14F, FontStyle.Regular);
            btn.FlatStyle = FlatStyle.Flat;
            btn.Click += delegate { DoAction(b, action); };
            return btn;
        }

        private void DoAction(Workbench b, string action)
        {
            if (action == "start" || action == "stop")
            {
                Task.Run(() =>
                {
                    bool ok = action == "start" ? b.Start() : b.Stop();
                    string result = action == "start" ? (ok ? "已开启" : "启动失败") : (ok ? "已关闭" : "关闭失败");
                    string msg = BuildActionMsg(ActionLabel(action), result, b);
                    Tool.Log(msg);
                    try { BeginInvoke(new Action(() => { AppendLog(b, msg); RefreshAllTabs(); })); } catch { }
                });
                return;
            }
            if (action == "restart")
            {
                Task.Run(() =>
                {
                    // 先关：记一条「关闭」
                    bool wasRunning = b.IsRunning();
                    bool stopped = wasRunning ? b.Stop() : true;
                    string stopMsg = BuildActionMsg("关闭", stopped ? (wasRunning ? "已关闭" : "本就未运行（无需关闭）") : "关闭失败", b);
                    System.Threading.Thread.Sleep(300);
                    // 再启：记一条「开启」
                    bool started = b.Start();
                    string startMsg = BuildActionMsg("开启", started ? "已开启" : "启动失败", b);
                    Tool.Log(stopMsg); Tool.Log(startMsg);
                    try { BeginInvoke(new Action(() => { AppendLog(b, stopMsg); AppendLog(b, startMsg); RefreshAllTabs(); })); } catch { }
                });
                return;
            }
            string m;
            if (action == "status") { m = "[ " + DateTime.Now.ToString("HH:mm:ss") + " ] 状态  " + b.StateLabel() + "\r\n"; }
            else if (action == "open") { b.OpenBrowser(); m = "[ " + DateTime.Now.ToString("HH:mm:ss") + " ] 打开网页  " + b.Url + "\r\n"; }
            else { m = "[ " + DateTime.Now.ToString("HH:mm:ss") + " ] " + action + "\r\n"; }
            AppendLog(b, m);
            Tool.Log(m);
        }

        private string ActionLabel(string a)
        {
            switch (a) { case "start": return "开启"; case "stop": return "关闭"; case "restart": return "重启"; case "status": return "状态"; case "open": return "打开网页"; default: return a; }
        }

        // 结构化工作台日志行（与开启/关闭/重启共用格式）
        private string BuildActionMsg(string label, string result, Workbench b)
        {
            return "[ " + DateTime.Now.ToString("HH:mm:ss") + " ] " + label + "  " + result
                + "\r\n工作台：" + b.Name + "\r\n启动命令：" + b.Args
                + "\r\n状态：" + b.StateLabel()
                + "\r\n----------------------------------------\r\n";
        }

        private void AppendLog(Workbench b, string text)
        {
            if (wbTabs == null) return;
            foreach (TabPage page in wbTabs.TabPages)
            {
                if (page.Text != b.Name) continue;
                foreach (Control c in page.Controls)
                {
                    TextBox log = c as TextBox;
                    if (log != null && log.Name == "cardLog") { log.Text = text + log.Text; log.SelectionStart = 0; log.ScrollToCaret(); return; }
                }
            }
        }

        private void RefreshAllTabs()
        {
            for (int i = 0; i < overviewStatus.Count && i < benches.Length; i++)
                overviewStatus[i].Text = "状态：" + benches[i].StateLabel() + "   ·   " + benches[i].Url;
            if (npsOverviewStatus != null) npsOverviewStatus.Text = "状态：" + (Nps.IsRunning() ? "运行中（外网已开）" : "已停止（外网已关）") + "   ·   " + Nps.ConfigSummary();
            // 各工作台子 tab 的状态标签：直接按字典更新，避免嵌套 Panel 里遍历不到
            foreach (var b in benches)
            {
                Label st;
                if (cardStatus.TryGetValue(b.Name, out st)) st.Text = "状态：" + b.StateLabel();
            }
            if (npsStatusLabel != null) npsStatusLabel.Text = "状态：" + (Nps.IsRunning() ? "运行中（外网已开）" : "已停止（外网已关）");
            UpdateTrayIcon(AnyRunning());
        }

        private void CopyLink(Workbench b, string url)
        {
            try
            {
                Clipboard.SetText(url);
                if (statusLabel != null) statusLabel.Text = "已复制链接：" + url;
                Tool.Log("已复制链接：" + url);
                if (b != null) AppendLog(b, "已复制链接：" + url + "\r\n");
            }
            catch (Exception ex)
            {
                Tool.Log("复制失败：" + ex.Message);
                if (statusLabel != null) statusLabel.Text = "复制失败";
                if (b != null) AppendLog(b, "复制失败：" + ex.Message + "\r\n");
            }
        }

        private bool AnyRunning()
        {
            foreach (var b in benches) if (b.IsRunning()) return true;
            return Nps.IsRunning();
        }

        private void UpdateTrayIcon(bool running)
        {
            Icon next = MakeIcon(running);
            if (trayIcon != null) trayIcon.Dispose();
            trayIcon = next;
            if (tray != null) tray.Icon = trayIcon;
        }

        // ---------- 全部启动/全部停止 ----------
        // includeNps=false：只按勾选项启动/停止各工作台（DSH智能体管理页内按钮）。
        // includeNps=true ：工作台(按勾选项) + NPS 外网访问一起（总览页按钮 & 托盘）。
        private void AllStart(bool includeNps)
        {
            var targets = CollectOneClickTargets();
            bool npsOn = includeNps && (npsCheck == null || npsCheck.Checked);
            if (targets.Count == 0 && !npsOn) { Tool.Log("没有任何工作台被勾选(且 NPS 未勾选)，跳过全部启动"); return; }
            Task.Run(() =>
            {
                foreach (var b in targets) b.Start();
                if (npsOn) Nps.Start();
                try { BeginInvoke(new Action(() => { Tool.Log("全部启动完成（工作台 " + targets.Count + " 个，NPS " + (npsOn ? "已处理" : "未处理") + "）"); RefreshAllTabs(); })); } catch { }
            });
        }

        private void AllStop(bool includeNps)
        {
            var targets = CollectOneClickTargets();
            bool npsOn = includeNps && (npsCheck == null || npsCheck.Checked);
            if (targets.Count == 0 && !npsOn) { Tool.Log("没有任何工作台被勾选(且 NPS 未勾选)，跳过全部停止"); return; }
            Task.Run(() =>
            {
                foreach (var b in targets) b.Stop();
                if (npsOn) Nps.Stop();
                try { BeginInvoke(new Action(() => { Tool.Log("全部停止完成（工作台 " + targets.Count + " 个，NPS " + (npsOn ? "已处理" : "未处理") + "）"); RefreshAllTabs(); })); } catch { }
            });
        }

        private List<Workbench> CollectOneClickTargets()
        {
            var targets = new List<Workbench>();
            foreach (var b in benches)
            {
                bool include = true;
                CheckBox c;
                if (oneClickChecks.TryGetValue(b.Name, out c)) include = c.Checked;
                if (include) targets.Add(b);
            }
            return targets;
        }

        // 让两个"一键开关控制"勾选框双向同步，避免循环触发
        private void SyncChecks(CheckBox a, CheckBox b)
        {
            if (a == null || b == null) return;
            a.CheckedChanged += (s, e) => { if (a.Checked != b.Checked) b.Checked = a.Checked; };
            b.CheckedChanged += (s, e) => { if (b.Checked != a.Checked) a.Checked = b.Checked; };
        }

        // 总览页与各tab页（工作台 + NPS）的"一键开关控制"勾选状态保持一致
        private void WireCheckSync()
        {
            foreach (Workbench b in benches)
            {
                CheckBox tab;
                if (oneClickChecks.TryGetValue(b.Name, out tab))
                {
                    CheckBox ov;
                    if (overviewChecks.TryGetValue(b.Name, out ov)) SyncChecks(tab, ov);
                }
            }
            SyncChecks(npsCheck, npsOverviewCheck);
        }

        // ---------- 系统托盘 ----------
        private void SetupTray()
        {
            tray = new NotifyIcon();
            tray.Text = "StartControllers — 工作台控制";
            this.Icon = (Icon)MakeIcon(AnyRunning()).Clone();   // 标题栏左上角图标：绿 C
            tray.Icon = MakeIcon(AnyRunning());
            trayIcon = tray.Icon;
            tray.Visible = true;
            tray.DoubleClick += (s, e) => ShowWindow();

            trayMenu = new ContextMenuStrip();
            var showItem = new ToolStripMenuItem("打开主界面"); showItem.Click += (s, e) => ShowWindow();
            var allStart = new ToolStripMenuItem("全部启动"); allStart.Click += (s, e) => AllStart(true);
            var allStop = new ToolStripMenuItem("全部停止"); allStop.Click += (s, e) => AllStop(true);
            var autoItem = new ToolStripMenuItem("开机自启"); autoItem.CheckOnClick = true; autoItem.Checked = IsAutoStart();
            autoItem.CheckedChanged += (s, e) => SetAutoStart(autoItem.Checked);
            var exitItem = new ToolStripMenuItem("退出"); exitItem.Click += (s, e) => ExitApp();

            trayMenu.Items.Add(showItem);
            trayMenu.Items.Add(allStart);
            trayMenu.Items.Add(allStop);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(autoItem);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(exitItem);
            tray.ContextMenuStrip = trayMenu;
        }

        private void ShowWindow() { Show(); WindowState = FormWindowState.Normal; Activate(); }
        private void ExitApp() { exiting = true; if (tray != null) tray.Visible = false; Application.Exit(); }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (exiting) { base.OnFormClosing(e); return; }
            e.Cancel = true;
            bool closeApp;
            using (var dlg = new CloseDialog()) { dlg.ShowDialog(this); closeApp = dlg.CloseApp; }
            if (closeApp) { exiting = true; if (tray != null) tray.Visible = false; Close(); }
            else { Hide(); if (tray != null) tray.ShowBalloonTip(1500, "StartControllers", "已最小化到系统托盘", ToolTipIcon.Info); }
        }

        // ---------- 开机自启（HKCU Run，同 DSHWebTray）----------
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        const string RunValue = "StartControllers";

        static bool IsAutoStart()
        {
            try { using (var key = Registry.CurrentUser.OpenSubKey(RunKey)) return key != null && key.GetValue(RunValue) != null; } catch { return false; }
        }

        static void SetAutoStart(bool enable)
        {
            try
            {
                using (var key = Registry.CurrentUser.CreateSubKey(RunKey))
                {
                    if (enable) key.SetValue(RunValue, "\"" + Application.ExecutablePath + "\"");
                    else key.DeleteValue(RunValue, false);
                }
                Tool.Log(enable ? "已设置开机自启" : "已取消开机自启");
            }
            catch (Exception ex) { Tool.Log("设置开机自启失败：" + ex.Message); }
        }

        static Icon MakeIcon(bool running)
        {
            using (var bmp = new Bitmap(16, 16))
            {
                using (var g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                    using (var b = new SolidBrush(running ? Color.FromArgb(60, 179, 60) : Color.FromArgb(120, 120, 120)))
                        g.FillEllipse(b, 1, 1, 14, 14);
                    using (var p = new Pen(Color.White, 2f))
                        g.DrawArc(p, 5, 5, 6, 6, 30, 300);   // 白色弧形，像 C / 电源开关
                }
                return Icon.FromHandle(bmp.GetHicon());
            }
        }

        [STAThread]
        public static void Main(string[] args)
        {
            bool createdNew;
            using (var mutex = new System.Threading.Mutex(true, "StartControllers_v1_SingleInstance", out createdNew))
            {
                if (!createdNew)
                {
                    // 已有实例在运行：通知它把窗口显示出来，然后本实例退出（不重复启动）
                    try
                    {
                        using (var signal = new System.Threading.EventWaitHandle(false, System.Threading.EventResetMode.AutoReset, "StartControllers_v1_ShowSignal"))
                            signal.Set();
                    }
                    catch { }
                    return;
                }
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                // 全局异常捕获：写入日志，避免未处理异常弹窗打断
                Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                Application.ThreadException += (s, e) => { try { Tool.Log("未处理异常：" + (e.Exception != null ? e.Exception.ToString() : "")); } catch { } };
                AppDomain.CurrentDomain.UnhandledException += (s, e) => { try { Tool.Log("AppDomain 异常：" + (e.ExceptionObject != null ? e.ExceptionObject.ToString() : "")); } catch { } };
                Application.Run(new MainForm());
            }
        }
    }

    // 关闭确认框：让用户二选一（确认关闭 / 放至托盘）。
    public class CloseDialog : Form
    {
        public bool CloseApp;
        public CloseDialog()
        {
            Text = "关闭 StartControllers";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            StartPosition = FormStartPosition.CenterParent;
            MaximizeBox = false; MinimizeBox = false; ControlBox = false;
            BackColor = Color.FromArgb(245, 247, 250);
            ClientSize = new Size(340, 160);

            Label msg = new Label();
            msg.Text = "要关闭 StartControllers 吗？"; msg.AutoSize = true;
            msg.Font = new Font("Microsoft YaHei", 13F); msg.ForeColor = Color.FromArgb(30, 40, 70);
            msg.Location = new Point(28, 24);
            Controls.Add(msg);

            Label sub = new Label();
            sub.Text = "选择「放至托盘」可继续在后台开关工作台。"; sub.AutoSize = true;
            sub.Font = new Font("Microsoft YaHei", 10F); sub.ForeColor = Color.FromArgb(120, 125, 135);
            sub.Location = new Point(28, 62);
            Controls.Add(sub);

            RoundedButton btnClose = new RoundedButton();
            btnClose.Text = "确认关闭"; btnClose.Width = 120; btnClose.Height = 42;
            btnClose.Location = new Point(40, 100);
            btnClose.Font = new Font("Microsoft YaHei", 12F);
            btnClose.NormalColor = Color.FromArgb(50, 90, 250); btnClose.HoverColor = Color.FromArgb(70, 110, 255); btnClose.ForeColor = Color.White;
            btnClose.Click += (s, e) => { CloseApp = true; DialogResult = DialogResult.OK; };
            Controls.Add(btnClose);

            RoundedButton btnTray = new RoundedButton();
            btnTray.Text = "放至托盘"; btnTray.Width = 120; btnTray.Height = 42;
            btnTray.Location = new Point(180, 100);
            btnTray.Font = new Font("Microsoft YaHei", 12F);
            btnTray.NormalColor = Color.FromArgb(240, 242, 246); btnTray.HoverColor = Color.FromArgb(221, 226, 233); btnTray.ForeColor = Color.FromArgb(58, 68, 88);
            btnTray.Click += (s, e) => { CloseApp = false; DialogResult = DialogResult.OK; };
            Controls.Add(btnTray);
        }
    }

    // 新增工作台对话框：填写 name/profile/port/desc
    public class AddWorkbenchDialog : Form
    {
        public string WbName, WbProfile, WbPort, WbDesc;
        private TextBox tbName, tbProfile, tbPort, tbDesc;
        public AddWorkbenchDialog(string defaultPort)
        {
            Text = "新增工作台"; FormBorderStyle = FormBorderStyle.FixedDialog;
            StartPosition = FormStartPosition.CenterParent; MaximizeBox = false; MinimizeBox = false;
            ClientSize = new Size(440, 280); BackColor = Color.White;

            int y = 24;
            tbName = AddField("名称", y); y += 42;
            tbProfile = AddField("profile", y); y += 42;
            tbPort = AddField("端口", y); tbPort.Text = defaultPort; y += 42;
            tbDesc = AddField("描述", y); y += 42;

            RoundedButton ok = new RoundedButton();
            ok.Text = "确定"; ok.Width = 110; ok.Height = 42;
            ok.Location = new Point(190, y + 4);
            ok.NormalColor = Color.FromArgb(50, 90, 250); ok.HoverColor = Color.FromArgb(70, 110, 255); ok.ForeColor = Color.White;
            ok.Click += (s, e) =>
            {
                WbName = tbName.Text.Trim(); WbProfile = tbProfile.Text.Trim(); WbPort = tbPort.Text.Trim(); WbDesc = tbDesc.Text.Trim();
                if (WbName == "" || WbProfile == "" || WbPort == "") { MessageBox.Show("名称 / profile / 端口 必填"); return; }
                DialogResult = DialogResult.OK;
            };
            Controls.Add(ok);

            RoundedButton cancel = new RoundedButton();
            cancel.Text = "取消"; cancel.Width = 110; cancel.Height = 42; cancel.Location = new Point(310, y + 4);
            cancel.NormalColor = Color.FromArgb(240, 242, 246); cancel.HoverColor = Color.FromArgb(221, 226, 233); cancel.ForeColor = Color.FromArgb(58, 68, 88);
            cancel.Click += (s, e) => { DialogResult = DialogResult.Cancel; };
            Controls.Add(cancel);
        }
        private TextBox AddField(string label, int y)
        {
            Label l = new Label(); l.Text = label; l.AutoSize = true; l.Font = new Font("Microsoft YaHei", 12F);
            l.ForeColor = Color.FromArgb(40, 50, 75); l.Location = new Point(24, y); Controls.Add(l);
            TextBox tb = new TextBox(); tb.Font = new Font("Microsoft YaHei", 12F); tb.Width = 270; tb.Left = 130; tb.Top = y - 2; Controls.Add(tb);
            return tb;
        }
    }
}
