<%@ Page Language="C#" AutoEventWireup="true" CodeFile="lexEdit.aspx.cs" Inherits="DesktopModules_LexinetCustMod_WebControls_lexEdit_lexEdit" %>
<%@ Register Src="~/DesktopModules/LexinetCustMod/WebControls/lexEdit2/lexEdit.ascx" TagName="EditorControl" TagPrefix="uc1" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title></title>
    <asp:PlaceHolder id="CSS" runat="server"/>
    <asp:placeholder id="SCRIPTS" runat="server"/>
</head>
<body>
    <form id="form1" runat="server">
        <uc1:EditorControl ID="EditorControl1" runat="server" />
    </form>   
</body>
</html>