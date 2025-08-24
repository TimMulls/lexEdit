using DotNetNuke.Entities.Host;
using DotNetNuke.Framework;
using LEX;
using System;
using System.Web.UI;

public partial class lexEdit : BaseModClass {
    protected int FOrderNumber;
    private OrderManagement OM;
    private ProductManagement ProductManagement;

    protected void Page_Init(object sender, EventArgs e) {
        AddJS(ControlPath + "dist/vendors.bundle.js?ver=" + Host.CrmVersion, "vendors.bundle.js", false);
        //AddCSS(ControlPath + "dist/vendors.css?ver=" + Host.CrmVersion, "vendors.css");
        AddJS(ControlPath + "dist/index.bundle.js?ver=" + Host.CrmVersion, "index.bundle.js", false);
        AddCSS(ControlPath + "dist/styles.css?ver=" + Host.CrmVersion, "styles.css");
        //AddJS(ControlPath + "lexEdit.js?ver=" + Host.CrmVersion, "lexEdit.js", true);
    }

    protected void Page_Load(object sender, EventArgs e) {
        AJAX.RegisterScriptManager();
    }

    private void InitCommon(int orderNumber, bool adminEdit, bool marketingSeries, bool envelope) {
        OM = new OrderManagement(ConnectStr);

        if (!adminEdit) {

            bool ValidateOrderStatus = true;

            if (Request.QueryString["VS"] != null) {
                ValidateOrderStatus = Convert.ToBoolean(Request.QueryString["VS"]);
            }

            CheckOrderSession(Page.Request.Url.ToString(), "Page_Load(object sender, EventArgs e)", ValidateOrderStatus);
        }

        FOrderNumber = orderNumber;

        lblOrderNum.Text = "Order Number: " + FOrderNumber;
        lblHelpPhone.Text = "Need help? Call us at " + SiteMembershipType.MembershipPhone;
        if (string.IsNullOrEmpty(hBackURL.Value) && Request.UrlReferrer != null) {
            hBackURL.Value = Request.UrlReferrer.OriginalString;
        }

        int eUserID = SiteIdentity.User.UserID;
        int eMembershipType = MembershipType;
        string eSessionID = Session.SessionID;

        if (adminEdit) {
            eUserID = int.Parse(OM.GetOrderField(FOrderNumber, "user_id"));
            MembershipType = int.Parse(OM.GetOrderField(FOrderNumber, "MembershipType"));
            eSessionID = "BackOfficeEdit";
        }

        string defaultSide = "";

        if (Request.QueryString["EditSide"] != null) {
            defaultSide = Request.QueryString["EditSide"].ToString();
        }

        if (envelope) {
            defaultSide = "envelope";
        }

        encURL.Value = Crypt.Encrypt("UserID=" + eUserID + "&OrderNumber=" + FOrderNumber +
            "&PortalID=" + PortalId + "&MembershipType=" + eMembershipType + "&SessionID=" + eSessionID +
            "&MarketingSeries=" + marketingSeries + "&Side=" + defaultSide);

        if (SiteIdentity.IsAuthenticated) {
            divImgLoginMsg.Visible = false;
        }

        if (marketingSeries || !IsPostBack) {
            ProductManagement = new ProductManagement(ConnectStr);

            using (DBI Order = OM.QueryOrder(FOrderNumber)) {
                if (!Order.Read()) {
                    Order.Close();
                    throw new Exception("Order Number '" + FOrderNumber + "' not found!");
                }

                int ProductType = Order.getInt32("ProductType");

                //ToDo:Fix this product in the orders table so this is not needed.
                if (Order.getInt32("Product") == 420255) {
                    ProductType = (int)ProductTypes.CanvasingCard;
                }

                if (Order.getBoolean("bRoundedCorners")) {
                    e5Canvas.Attributes["class"] = "RoundedCanvas";
                }

                using (DBI ProductInfo = ProductManagement.GetProductInfo(ProductType, Order.getInt32("Product"))) {
                    if (!ProductInfo.Read()) {
                        ProductInfo.Close();
                        throw new Exception("Product Not Found (" + ProductType + ", " +
                                            Order.getString("Product") + ")");
                    }

                    hProductType.Value = ProductType.ToString();
                    hProductSize.Value = ProductInfo.getInt32("ProductSizeId").ToString();
                    lblProductDesc.Text = "Description: " + ProductInfo.getString("ProductDescription");
                    ProductInfo.Close();
                }

                Order.Close();

                if (marketingSeries) {
                    OM.UpdateOrderField(FOrderNumber, "CardEdited", "1");
                    OM.CompleteOrderStep(FOrderNumber, "EditFront", "Products/MarketingSeries/EditSeriesAdv.aspx?Front");

                    if (IsPostBack) {
                        ScriptManager.RegisterStartupScript(this, GetType(), "Init2StartUp", "window.lexEdit.Start();", true);
                    }
                }
                else {
                    if (envelope) {
                        OM.CompleteOrderStep(FOrderNumber, "EditFront", "Products/EditCard/EditEnvelopeAdv.aspx?Front");
                    }
                    else {
                        OM.UpdateOrderField(FOrderNumber, "CardEdited", "1");
                        OM.CompleteOrderStep(FOrderNumber, "EditFront", "Products/EditCard/EditTemplateAdv.aspx?Front");
                    }
                }
            }
        }
    }

    public void InitEnvelopeEditor(int orderNumber, bool adminEdit = false) {
        btnBack.Visible = false;
        InitCommon(orderNumber, adminEdit, false, true);
    }

    public void InitEditor(int orderNumber, bool marketingSeries = false, bool adminEdit = false) {
        InitCommon(orderNumber, adminEdit, marketingSeries, false);

        if (OM.GetOrderField(FOrderNumber, "ProductType") == ((int)ProductTypes.JamesHardieYardSign).ToString()) {
            Editor.InsertOrderNumber(FOrderNumber);
        }
    }

    protected void btnBack_OnClick(object sender, EventArgs e) {
        if (hBackURL.Value.Contains("MyAccount.aspx")) {
            Response.Redirect(hBackURL.Value);
        }
        else if (hBackURL.Value.Contains("MarketingSeries.aspx")) {
            Response.Redirect(hBackURL.Value);
        }
        else if (hBackURL.Value.Contains("VBSMarketing/SelectProduct.aspx?ThemeID")) {
            Response.Redirect(hBackURL.Value);
        }
        else {
            Response.Redirect(ApplicationPath() +
                Editor.BackButtonClick(FOrderNumber, Convert.ToInt32(hProductSize.Value), MembershipType));
        }
    }
}