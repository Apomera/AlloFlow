import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# The original import line
old_import = """import { Inbox, BookOpen, Globe, Layers, ArrowRight, Sparkles, FileText, Layout, HelpCircle, CircleHelp, CheckCircle2, RefreshCw, Search, X, Plus, Trash2, Image as ImageIcon, AlertCircle, AlertTriangle, Download, Quote, Volume2, VolumeX, StopCircle, FileDown, PenTool, Palette, Ban, Printer, History, Heart, Code, Clock, Pencil, Save, ChevronUp, ChevronDown, CheckSquare, Settings2, Send, MessageSquare, Smile, ShieldCheck, FileQuestion, Lightbulb, ArrowDown, GitMerge, Upload, ListChecks, GripVertical, Maximize, Minimize, Maximize2, Minimize2, GalleryHorizontal, Languages, Mic, MicOff, Copy, CheckCircle, XCircle, Info, Type, Sun, Moon, Eye, EyeOff, MonitorPlay, MousePointerClick, ClipboardList, Gamepad2, ScanLine, Users, SaveAll, FolderDown, FolderUp, School, GraduationCap, Map as MapIcon, Highlighter, Bold, Italic, List, Share2, Cloud, CloudOff, Wifi, WifiOff, Brain, Trophy, Flag, ArrowUpRight, GitCompare, Folder, FolderPlus, FolderOpen, FolderInput, Backpack, Link, Zap, ZapOff, ArrowUp, Filter, Lock, Unlock, Wrench, Octagon, Ear, Calculator, Settings, ListOrdered, MessageCircleQuestion, Terminal, AlignJustify, ShoppingBag, Headphones, Unplug, Star, Shuffle, Play, PlayCircle, Pause, UserCircle2, Scale, Monitor, User, ExternalLink, Key, ChevronLeft, ChevronRight, DoorOpen, UserCheck, Check, Loader2, Wand2, Package, BarChart2, Move, Music, Edit2 , ArrowLeft , ScanSearch, GripHorizontal, Scissors } from 'lucide-react';"""

new_import = """// Navigation & Directional icons
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Move, ExternalLink, DoorOpen, Link } from 'lucide-react';
// Status & Feedback icons
import { CheckCircle, CheckCircle2, CheckSquare, Check, AlertCircle, AlertTriangle, XCircle, Info, Lightbulb, ShieldCheck, Loader2, Ban, Octagon, X } from 'lucide-react';
// Action & Editing icons
import { Save, SaveAll, Download, Upload, Copy, Send, Search, Plus, Trash2, Pencil, Edit2, PenTool, Bold, Italic, Highlighter, Cut, RefreshCw, Filter, Lock, Unlock, Wrench, Wand2, Scissors, GripVertical, GripHorizontal } from 'lucide-react';
// Media & Audio icons
import { Volume2, VolumeX, StopCircle, Mic, MicOff, Play, PlayCircle, Pause, Music, Headphones, Shuffle, Ear, MonitorPlay } from 'lucide-react';
// UI, Layout & Domain icons
import { Inbox, BookOpen, Globe, Layers, Sparkles, FileText, Layout, HelpCircle, CircleHelp, Image as ImageIcon, Quote, FileDown, Palette, Printer, History, Heart, Code, Clock, Settings2, MessageSquare, Smile, FileQuestion, GitMerge, ListChecks, Maximize, Minimize, Maximize2, Minimize2, GalleryHorizontal, Languages, ClipboardList, Gamepad2, ScanLine, Users, FolderDown, FolderUp, School, GraduationCap, Map as MapIcon, List, Share2, Cloud, CloudOff, Wifi, WifiOff, Brain, Trophy, Flag, GitCompare, Folder, FolderPlus, FolderOpen, FolderInput, Backpack, Zap, ZapOff, Calculator, Settings, ListOrdered, MessageCircleQuestion, Terminal, AlignJustify, ShoppingBag, Unplug, Star, UserCircle2, Scale, Monitor, User, Key, UserCheck, Package, BarChart2, Type, Sun, Moon, Eye, EyeOff, MousePointerClick, ScanSearch } from 'lucide-react';"""

if old_import in text:
    text = text.replace(old_import, new_import)
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Lucide import split into 5 categorical groups")
    
    # Verify all icons are still present
    import re
    all_icons_old = set()
    # Parse old import
    match = re.search(r'\{([^}]+)\}', old_import)
    if match:
        for item in match.group(1).split(','):
            item = item.strip()
            if ' as ' in item:
                item = item.split(' as ')[0].strip()
            if item:
                all_icons_old.add(item)
    
    all_icons_new = set()
    for m in re.finditer(r'import \{([^}]+)\} from', new_import):
        for item in m.group(1).split(','):
            item = item.strip()
            if ' as ' in item:
                item = item.split(' as ')[0].strip()
            if item:
                all_icons_new.add(item)
    
    missing = all_icons_old - all_icons_new
    extra = all_icons_new - all_icons_old
    print(f"Old icons: {len(all_icons_old)}, New icons: {len(all_icons_new)}")
    if missing:
        print(f"MISSING icons: {missing}")
    if extra:
        print(f"EXTRA icons (new): {extra}")
    if not missing and not extra:
        print("VERIFIED: All icons preserved, no extras")
else:
    print("ERROR: Could not find the original import line")
    # Try to find a close match
    lines = text.split('\n')
    for i, l in enumerate(lines):
        if "from 'lucide-react'" in l:
            print(f"  Found lucide import at L{i+1}: {l[:100]}...")
