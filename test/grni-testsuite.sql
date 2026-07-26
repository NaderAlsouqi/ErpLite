SET NOCOUNT ON;
SET XACT_ABORT ON;

/* ============================================================================
   Test suite: Purchasing / GRNI three-way-match accounting
   Item 1100006, cost 10, qty 30  ->  goods 300, VAT 45 (15%), total 345.
   Emits one ##ROW## line per assertion:  id|category|check|expected|actual|status
   ============================================================================ */

DECLARE @item VARCHAR(20)='1100006';
DECLARE @req VARCHAR(20)='9010', @pof VARCHAR(20)='9510', @po VARCHAR(30)='PO-TEST-9510',
        @rcpt VARCHAR(15)='9510', @inv VARCHAR(20)='5010', @yr INT=2026, @vt INT=1;
DECLARE @ven NUMERIC(18,3)=(SELECT TOP 1 [No] FROM dbo.Venf WHERE ISNULL(Acc,0)>0 ORDER BY [No]);

/* results collector */
DECLARE @R TABLE (id INT IDENTITY(1,1), cat VARCHAR(30), chk VARCHAR(140), exp VARCHAR(40), act VARCHAR(40));

/* ---- tidy any leftovers from a previous run (idempotent) ---- */
BEGIN TRY EXEC dbo.SP_DeletePurchInv @InvNo=@inv, @Year=@yr; END TRY BEGIN CATCH END CATCH;
BEGIN TRY EXEC dbo.SP_DeleteGoodsReceipt @VType=@vt, @DocNo=@rcpt, @Myear=@yr; END TRY BEGIN CATCH END CATCH;
DELETE FROM dbo.PurchOrd2 WHERE PONo=@po AND myear=@yr;
DELETE FROM dbo.PurchOrd1 WHERE PONo=@po AND myear=@yr;
DELETE FROM dbo.pof2 WHERE order_no=@pof AND myear=@yr AND V_TYPE=@vt;
DELETE FROM dbo.pof1 WHERE order_no=@pof AND myear=@yr AND V_Type=@vt;
UPDATE i SET i.oq2=ISNULL(i.oq2,0)-ISNULL(d.oq2,0) FROM dbo.invf i JOIN dbo.ItemReq2 d ON d.item_no=i.Item_No WHERE d.order_no=@req;
DELETE FROM dbo.ItemReq2 WHERE order_no=@req;
DELETE FROM dbo.ItemReq1 WHERE order_no=@req;

DECLARE @oq NUMERIC(18,3), @rq NUMERIC(18,3), @req_rq NUMERIC(18,3), @stock NUMERIC(18,3);

/* ═══ STAGE 1 — material request qty 30 ═══ */
DECLARE @rl dbo.ItemReqLineType;
INSERT INTO @rl(ItemNo,UnitNo,Operand,Qty,ItemName) VALUES(@item,2,1,30,'Toluene');
EXEC dbo.SP_SaveItemReq @OrderNo=@req,@ODate='2026-07-26',@Section='TEST',@Notes='grni suite',@Lines=@rl;
SET @oq=(SELECT ISNULL(oq2,0) FROM dbo.invf WHERE Item_No=@item);
INSERT INTO @R(cat,chk,exp,act) VALUES('Quantities','Material request raises on-order (invf.oq2)','30.000',CAST(@oq AS VARCHAR(40)));

/* ═══ STAGE 2 — purchase order (pof) linked to the request ═══ */
DECLARE @pl dbo.PofLineType;
INSERT INTO @pl(ItemNo,ItemName,UnitNo,Operand,Qty,Cost,StoreNo,CCntrNo,Barcode) VALUES(@item,'Toluene',2,1,30,10,1,0,NULL);
EXEC dbo.SP_SavePof @OrderNo=@pof,@Year=@yr,@VType=@vt,@BrNo=0,@ODate='2026-07-26',@VenNo=@ven,@DAcc='',@Cluse=0,@CurNo=1,@Rate=1,
  @ItemReq=@req,@ManF=0,@DelvTime='',@DelvD='',@DelivNote='',@Origin='',@Packing='',@Partial=1,@Dis=0,@Percentage=0,
  @Note1='',@Note2='',@Note3='',@Note4='',@Note5='',@Tot=300,@Lines=@pl;
SET @oq=(SELECT ISNULL(oq2,0) FROM dbo.invf WHERE Item_No=@item);
INSERT INTO @R(cat,chk,exp,act) VALUES('Quantities','Purchase order does NOT change on-order','30.000',CAST(@oq AS VARCHAR(40)));

/* ═══ STAGE 3 — أمر الشراء sourcing the pof ═══ */
DECLARE @ol dbo.PurchOrdLineType;
INSERT INTO @ol(LineNum,ItemNo,ItemName,UnitNo,UnitRate,Qty,UnitPrice,DiscPerc,TaxNo,StoreNo,IsFreeGoods,Barcode,Note)
  VALUES(1,@item,'Toluene',2,1,30,10,0,0,1,0,NULL,NULL);
DECLARE @dd dbo.PurchOrdDelvType;
EXEC dbo.SP_SavePurchOrd @PONo=@po,@Year=@yr,@PODate='2026-07-26',@DelvDate='2026-08-05',@VenNo=@ven,@CurNo=1,@Rate=1,@Cluse=0,@StoreNo=1,
  @SourcePONo=@pof,@SourcePOYear=@yr,@SourcePOVType=@vt,@Remarks='grni suite',@UserId=NULL,@MultiDelv=0,@Lines=@ol,@DelvDates=@dd;
SET @oq=(SELECT ISNULL(oq2,0) FROM dbo.invf WHERE Item_No=@item);
INSERT INTO @R(cat,chk,exp,act) VALUES('Quantities','Formal purchase order does NOT change on-order','30.000',CAST(@oq AS VARCHAR(40)));

/* ═══ STAGE 4 — goods receipt qty 30 ═══ */
DECLARE @gl dbo.GoodsReceiptLineType;
INSERT INTO @gl(ItemNo,UnitNo,UnitRate,Qty,Cost,Weight,StoreNo,ExpDate,BatchNo,DebitAcc,CreditAcc,CostCenter)
  VALUES(@item,2,1,30,10,0,1,NULL,NULL,0,0,0);
EXEC dbo.SP_SaveGoodsReceipt @VType=@vt,@DocNo=@rcpt,@Myear=@yr,@TransDate='2026-07-26',@Tg=0,@VendorNo=@ven,@BrNo=0,
  @Des=N'grni suite',@Prod=0,@PdfPath=NULL,@CreditAcc=0,@RcptPONo=@po,@RcptPOYear=@yr,@RcptPOVType=@vt,@Lines=@gl;
DECLARE @inb VARCHAR(15)=(SELECT InbDocNo FROM dbo.i2_transf1 WHERE Kind=1 AND RTRIM(doctype)='37' AND V_type=@vt AND Doc_No=@rcpt AND myear=@yr);

SET @oq=(SELECT ISNULL(oq2,0) FROM dbo.invf WHERE Item_No=@item);
SET @rq=(SELECT ISNULL(rqty,0) FROM dbo.pof2 WHERE order_no=@pof AND myear=@yr AND V_TYPE=@vt AND item_no=@item);
SET @req_rq=(SELECT ISNULL(rqty,0) FROM dbo.ItemReq2 WHERE order_no=@req AND item_no=@item);
SET @stock=(SELECT ISNULL(SUM(CASE WHEN h.Kind IN(1,4) THEN t.A_QTY WHEN h.Kind IN(2,3) THEN -t.A_QTY END),0)
            FROM dbo.i2_transf2 t JOIN dbo.i2_transf1 h ON h.Trans_No=t.Trans_No WHERE t.Item_No=@item);
INSERT INTO @R(cat,chk,exp,act) VALUES('Quantities','Goods receipt relieves on-order to zero','0.000',CAST(@oq AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Quantities','Received qty stamped on purchase-order line (pof2.rqty)','30.000',CAST(@rq AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Quantities','Received qty stamped on request line (ItemReq2.rqty)','30.000',CAST(@req_rq AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Quantities','Stock on-hand rises by 30 (single generated inbound)','30.000',CAST(@stock AS VARCHAR(40)));

/* receipt GL (doctype 20) */
DECLARE @dr NUMERIC(18,2), @grniCr NUMERIC(18,2), @bal NUMERIC(18,2);
SET @dr=(SELECT ISNULL(SUM(CASE WHEN amt>0 THEN amt END),0) FROM dbo.transf2 t JOIN dbo.transf1 h ON h.Trans_Num=t.Trans_Num WHERE h.doc_num=@inb AND h.doctype=20 AND h.myear=@yr);
SET @grniCr=(SELECT ISNULL(-SUM(amt),0) FROM dbo.transf2 t JOIN dbo.transf1 h ON h.Trans_Num=t.Trans_Num WHERE h.doc_num=@inb AND h.doctype=20 AND h.myear=@yr AND t.acc=201002);
SET @bal=(SELECT ISNULL(SUM(amt),0) FROM dbo.transf2 t JOIN dbo.transf1 h ON h.Trans_Num=t.Trans_Num WHERE h.doc_num=@inb AND h.doctype=20 AND h.myear=@yr);
INSERT INTO @R(cat,chk,exp,act) VALUES('Receipt GL','Dr Inventory total = 300','300.00',CAST(@dr AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Receipt GL','Cr GRNI (201002) = 300','300.00',CAST(@grniCr AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Receipt GL','Entry is balanced (debits = credits)','0.00',CAST(@bal AS VARCHAR(40)));

/* ═══ STAGE 5 — purchase invoice, VAT 45 ═══ */
EXEC dbo.SP_SavePurchInv @InvNo=@inv,@Year=@yr,@InvDate='2026-07-26',@RcptVType=@vt,@RcptDocNo=@rcpt,@RcptYear=@yr,
  @SupplierInvNo='SUP-777',@VatAmount=45,@Notes=N'grni suite',@UserId=NULL;

DECLARE @grniDr NUMERIC(18,2), @vatDr NUMERIC(18,2), @venCr NUMERIC(18,2), @ibal NUMERIC(18,2), @grniNet NUMERIC(18,2);
SET @grniDr=(SELECT ISNULL(SUM(amt),0) FROM dbo.transf2 t JOIN dbo.transf1 h ON h.Trans_Num=t.Trans_Num WHERE h.doc_num=@inv AND h.doctype=30 AND h.myear=@yr AND t.acc=201002);
SET @vatDr =(SELECT ISNULL(SUM(amt),0) FROM dbo.transf2 t JOIN dbo.transf1 h ON h.Trans_Num=t.Trans_Num WHERE h.doc_num=@inv AND h.doctype=30 AND h.myear=@yr AND t.acc=10203);
SET @venCr =(SELECT ISNULL(-SUM(amt),0) FROM dbo.transf2 t JOIN dbo.transf1 h ON h.Trans_Num=t.Trans_Num WHERE h.doc_num=@inv AND h.doctype=30 AND h.myear=@yr AND t.acc NOT IN(201002,10203));
SET @ibal  =(SELECT ISNULL(SUM(amt),0) FROM dbo.transf2 t JOIN dbo.transf1 h ON h.Trans_Num=t.Trans_Num WHERE h.doc_num=@inv AND h.doctype=30 AND h.myear=@yr);
SET @grniNet=(SELECT ISNULL(SUM(amt),0) FROM dbo.transf2 t JOIN dbo.transf1 h ON h.Trans_Num=t.Trans_Num WHERE t.acc=201002 AND h.myear=@yr AND h.doc_num IN(@inb,@inv));
INSERT INTO @R(cat,chk,exp,act) VALUES('Invoice GL','Dr GRNI (clears the holding account) = 300','300.00',CAST(@grniDr AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Invoice GL','Dr VAT input (10203) = 45','45.00',CAST(@vatDr AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Invoice GL','Cr Supplier / payable = 345','345.00',CAST(@venCr AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Invoice GL','Entry is balanced (debits = credits)','0.00',CAST(@ibal AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Invoice GL','GRNI nets to zero across receipt + invoice','0.00',CAST(@grniNet AS VARCHAR(40)));

/* controls */
DECLARE @stamp VARCHAR(20)=(SELECT ISNULL(PurchInvNo,'') FROM dbo.i2_transf1 WHERE Kind=1 AND RTRIM(doctype)='37' AND V_type=@vt AND Doc_No=@rcpt AND myear=@yr);
INSERT INTO @R(cat,chk,exp,act) VALUES('Controls','Receipt is stamped with the invoice no',@inv,@stamp);
DECLARE @blocked VARCHAR(4)='no';
BEGIN TRY EXEC dbo.SP_DeleteGoodsReceipt @VType=@vt,@DocNo=@rcpt,@Myear=@yr; END TRY BEGIN CATCH SET @blocked='yes'; END CATCH;
INSERT INTO @R(cat,chk,exp,act) VALUES('Controls','Deleting an invoiced receipt is blocked','yes',@blocked);

/* ═══ STAGE 6 — reverse: delete invoice ═══ */
EXEC dbo.SP_DeletePurchInv @InvNo=@inv,@Year=@yr;
DECLARE @igl INT=(SELECT COUNT(*) FROM dbo.transf1 WHERE doc_num=@inv AND doctype=30 AND myear=@yr);
DECLARE @stamp2 VARCHAR(20)=(SELECT ISNULL(PurchInvNo,'') FROM dbo.i2_transf1 WHERE Kind=1 AND RTRIM(doctype)='37' AND V_type=@vt AND Doc_No=@rcpt AND myear=@yr);
INSERT INTO @R(cat,chk,exp,act) VALUES('Reversal','Deleting invoice removes its GL entry','0',CAST(@igl AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Reversal','Deleting invoice un-stamps the receipt','(empty)',CASE WHEN @stamp2='' THEN '(empty)' ELSE @stamp2 END);

/* ═══ STAGE 7 — reverse: delete receipt ═══ */
EXEC dbo.SP_DeleteGoodsReceipt @VType=@vt,@DocNo=@rcpt,@Myear=@yr;
SET @oq=(SELECT ISNULL(oq2,0) FROM dbo.invf WHERE Item_No=@item);
SET @rq=(SELECT ISNULL(rqty,0) FROM dbo.pof2 WHERE order_no=@pof AND myear=@yr AND V_TYPE=@vt AND item_no=@item);
SET @stock=(SELECT ISNULL(SUM(CASE WHEN h.Kind IN(1,4) THEN t.A_QTY WHEN h.Kind IN(2,3) THEN -t.A_QTY END),0)
            FROM dbo.i2_transf2 t JOIN dbo.i2_transf1 h ON h.Trans_No=t.Trans_No WHERE t.Item_No=@item);
INSERT INTO @R(cat,chk,exp,act) VALUES('Reversal','Deleting receipt restores on-order to 30','30.000',CAST(@oq AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Reversal','Deleting receipt clears received qty (pof2.rqty)','0.000',CAST(@rq AS VARCHAR(40)));
INSERT INTO @R(cat,chk,exp,act) VALUES('Reversal','Deleting receipt reverses stock to 0','0.000',CAST(@stock AS VARCHAR(40)));

/* ---- cleanup the chain ---- */
DELETE FROM dbo.PurchOrd2 WHERE PONo=@po AND myear=@yr;
DELETE FROM dbo.PurchOrd1 WHERE PONo=@po AND myear=@yr;
DELETE FROM dbo.pof2 WHERE order_no=@pof AND myear=@yr AND V_TYPE=@vt;
DELETE FROM dbo.pof1 WHERE order_no=@pof AND myear=@yr AND V_Type=@vt;
UPDATE i SET i.oq2=ISNULL(i.oq2,0)-ISNULL(d.oq2,0) FROM dbo.invf i JOIN dbo.ItemReq2 d ON d.item_no=i.Item_No WHERE d.order_no=@req;
DELETE FROM dbo.ItemReq2 WHERE order_no=@req;
DELETE FROM dbo.ItemReq1 WHERE order_no=@req;
SET @oq=(SELECT ISNULL(oq2,0) FROM dbo.invf WHERE Item_No=@item);
INSERT INTO @R(cat,chk,exp,act) VALUES('Cleanup','Item returns to pristine state (on-order 0)','0.000',CAST(@oq AS VARCHAR(40)));

/* ---- emit ---- */
SELECT '##ROW##'+CAST(id AS VARCHAR(5))+'|'+cat+'|'+chk+'|'+exp+'|'+act+'|'+
       CASE WHEN LTRIM(RTRIM(exp))=LTRIM(RTRIM(act)) THEN 'PASS' ELSE 'FAIL' END
FROM @R ORDER BY id;
