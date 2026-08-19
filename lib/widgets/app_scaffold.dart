import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/theme.dart';

class AppScaffold extends StatefulWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? bottomNavigationBar;
  final Widget? drawer;
  final Widget? floatingActionButton;
  final bool isRootScreen;
  final Color? backgroundColor;

  const AppScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.bottomNavigationBar,
    this.drawer,
    this.floatingActionButton,
    this.isRootScreen = false,
    this.backgroundColor,
  });

  @override
  State<AppScaffold> createState() => _AppScaffoldState();
}

class _AppScaffoldState extends State<AppScaffold> {
  DateTime? _lastBackPressTime;

  @override
  Widget build(BuildContext context) {
    if (!widget.isRootScreen) {
      return Scaffold(
        backgroundColor: widget.backgroundColor ?? AppColors.background,
        appBar: widget.appBar,
        drawer: widget.drawer,
        body: SafeArea(child: widget.body),
        bottomNavigationBar: widget.bottomNavigationBar,
        floatingActionButton: widget.floatingActionButton,
      );
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;

        final now = DateTime.now();
        if (_lastBackPressTime == null ||
            now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
          _lastBackPressTime = now;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Press back again to exit ConnectHub'),
              duration: Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: widget.backgroundColor ?? AppColors.background,
        appBar: widget.appBar,
        drawer: widget.drawer,
        body: SafeArea(child: widget.body),
        bottomNavigationBar: widget.bottomNavigationBar,
        floatingActionButton: widget.floatingActionButton,
      ),
    );
  }
}
