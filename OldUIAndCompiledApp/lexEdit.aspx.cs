using DotNetNuke.Framework;
using LEX;
using System;
using System.Web.UI;

public partial class DesktopModules_LexinetCustMod_WebControls_lexEdit_lexEdit : Page {

    protected void Page_Init(object sender, EventArgs e) {
    }

    protected void Page_Load(object sender, EventArgs e) {
        int eUserID = 7083;
        int eMembershipType = 100020;
        string eSessionID = Session.SessionID;
        int eOrderNumber = 67766;
        int PortalId = 4;
        bool marketingSeries = false;
        string defaultSide = "";

        string encURL = Crypt.Encrypt("UserID=" + eUserID + "&OrderNumber=" + eOrderNumber +
            "&PortalID=" + PortalId + "&MembershipType=" + eMembershipType + "&SessionID=" + eSessionID +
            "&MarketingSeries=" + marketingSeries + "&Side=" + defaultSide);

        EditorControl1.InitEditor(eOrderNumber, false, true);
    }
}