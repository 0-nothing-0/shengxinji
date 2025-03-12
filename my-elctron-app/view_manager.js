// view_manager.js
class ViewManager {
    constructor() {
        this.views = {};
        this.currentView = null;
    }

    // 注册视图
    registerView(viewName, elementId) {
        this.views[viewName] = document.getElementById(elementId);
    }

    // 设置默认视图
    setDefaultView(viewName) {
        this.currentView = viewName;
        this.showView(viewName);
    }

    // 显示视图
    showView(viewName, params = {}) {
        if (this.currentView) {
            this.views[this.currentView].style.display = 'none';
        }
        this.views[viewName].style.display = 'block';
        this.currentView = viewName;

        // 如果有参数传递，可以在这里处理
        if (viewName === 'ledger-detail' && params.ledgerId) {
            this.loadLedgerDetail(params.ledgerId);
        }
    }

    // 加载账本详情
    loadLedgerDetail(ledgerId) {
        // 这里可以调用你的 API 加载账本详情
        console.log('Loading ledger detail for ID:', ledgerId);
        // 例如：loadAccounts(ledgerId);
    }
}
